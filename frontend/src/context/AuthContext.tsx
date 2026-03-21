import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, TipoUsuario } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (correo: string, password: string) => Promise<void>;
  register: (correo: string, password: string, confirmPassword: string, tipoUsuario: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  hasRole: (...roles: TipoUsuario[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recuperar sesión al montar
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authService.me()
        .then(setUser)
        .catch(() => { localStorage.clear(); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (correo: string, password: string) => {
    const result = await authService.login(correo, password);
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    setUser(result.user);
  };

  const register = async (correo: string, password: string, confirmPassword: string, tipoUsuario: string) => {
    const result = await authService.register(correo, password, confirmPassword, tipoUsuario);
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    setUser(result.user);
  };

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const hasRole = useCallback((...roles: TipoUsuario[]) => {
    return user ? roles.includes(user.tipoUsuario) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
