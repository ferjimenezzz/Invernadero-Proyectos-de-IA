import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/api';
import type { UserProfile } from '../types/profile';

interface AuthState {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Sesión en memoria. Para persistirla entre reinicios, guarda el token con
 * expo-secure-store dentro de login() y léelo al montar el provider.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginRequest(email, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
