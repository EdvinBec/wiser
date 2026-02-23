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
      const payload = JSON.parse(atob(token.split('.')[1]));
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
