import {createContext, useContext} from 'react';

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type AuthContextType = {
  user: User | null;
  token: string | null;
  login: () => void;
  /** Deliberate sign-out. Discards the local timetable too, so a shared phone comes up clean. */
  logout: () => void;
  /**
   * The server refused the token, so the session is over whether or not anybody asked. Keeps the
   * local timetable: for somebody who picked their subjects and never had them reach an account,
   * that copy is the only one there is, and ending a session is no reason to destroy it.
   */
  endSession: () => void;
  isAuthenticated: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
