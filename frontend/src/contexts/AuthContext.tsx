import {useEffect, useState, type ReactNode} from 'react';
import {AuthContext, type User} from './AuthContext.shared';

export function AuthProvider({children}: {children: ReactNode}) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      // Properly decode JWT with UTF-8 support (handles šumniki like ć, š, ž)
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const payload = JSON.parse(jsonPayload);

      setUser({
        id: payload[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ],
        email:
          payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
          ],
        displayName: payload.displayName || null,
        avatarUrl: payload.avatarUrl || null,
      });
    } catch (error) {
      console.error('Failed to decode token:', error);
      setToken(null);
      localStorage.removeItem('authToken');
    }
  }, [token]);

  const login = () => {
    window.location.href = 'http://localhost:5013/auth/google';
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider
      value={{user, token, login, logout, isAuthenticated: !!user}}>
      {children}
    </AuthContext.Provider>
  );
}
