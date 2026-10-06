import {API_HOST} from '@/lib/apiHost';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {AuthContext, type User} from './AuthContext.shared';

type Decoded = {user: User; expiresAt: number | null};

/**
 * Reads what a JWT claims about its bearer.
 *
 * Decoding is not verification. The signature is never checked here and cannot be, so this says
 * what the token ASSERTS, never whether the server will accept it. `exp` is the one claim worth
 * acting on locally, because a token past it is certain to be refused — there is no sense
 * presenting somebody as signed in while every request they make comes back 401.
 */
function decodeToken(token: string): Decoded | null {
  try {
    // UTF-8 safe, so šumniki in a display name survive (ć, š, ž).
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);

    return {
      user: {
        id: payload[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ],
        email:
          payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
          ],
        displayName: payload.displayName || null,
        avatarUrl: payload.avatarUrl || null,
      },
      // `exp` is in seconds since the epoch, and is optional in principle.
      expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

function isUsable(decoded: Decoded | null): decoded is Decoded {
  if (!decoded) return false;
  return decoded.expiresAt === null || decoded.expiresAt > Date.now();
}

/** Tokens live 30 days; anything stored before that cut has to be let go of at the door. */
function readStoredToken(): string | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('authToken');
  } catch {
    return null; // Private mode, blocked site data — sign-in simply will not persist.
  }
  if (!stored) return null;

  if (!isUsable(decodeToken(stored))) {
    // An expired token used to sail straight through. Its payload still decodes, so the header
    // showed the student's name and the app believed they were signed in, while every request
    // carrying it came back 401 — and the 401 was swallowed, so the timetable just looked
    // empty. That is the whole of "it says I'm logged in but my subjects are gone".
    try {
      localStorage.removeItem('authToken');
    } catch {
      /* nothing to clean up */
    }
    return null;
  }
  return stored;
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const decoded = decodeToken(token);
    if (!isUsable(decoded)) {
      setUser(null);
      setToken(null);
      try {
        localStorage.removeItem('authToken');
      } catch {
        /* nothing to clean up */
      }
      return;
    }

    setUser(decoded.user);
  }, [token]);

  const login = useCallback(() => {
    window.location.href = `${API_HOST}/auth/google`;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('authToken');
      // The student's own selections go too. Leaving them behind meant the next person to sign
      // in on a shared phone inherited the previous one's timetable whenever their own account
      // had nothing saved yet.
      localStorage.removeItem('wiserSelectionsV1');
    } catch {
      /* nothing to clean up */
    }
    // Reload rather than unwind the state by hand. The selections also live in React state one
    // level down, whose own effect would write them straight back into the storage just
    // cleared; signing in already works this way, so signing out matches it.
    window.location.href = '/';
  }, []);

  // Nobody chose this one, so it takes nothing away: the local timetable stays exactly where it
  // is, and no reload is forced either — the student keeps looking at their subjects and simply
  // sees that they are signed out.
  const endSession = useCallback(() => {
    try {
      localStorage.removeItem('authToken');
    } catch {
      /* nothing to clean up */
    }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{user, token, login, logout, endSession, isAuthenticated: !!user}}>
      {children}
    </AuthContext.Provider>
  );
}
