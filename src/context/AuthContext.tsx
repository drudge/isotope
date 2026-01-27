import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, getSessionInfo } from '@/api/auth';
import { apiClient } from '@/api/client';
import type { User } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const token = apiClient.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await getSessionInfo();
      if (response.status === 'ok' && response.username) {
        setUser({
          displayName: response.displayName || response.username,
          username: response.username,
          disabled: response.disabled || false,
        });
      } else {
        apiClient.clearToken();
        setUser(null);
      }
    } catch {
      apiClient.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleInvalidToken = () => {
      setUser(null);
    };

    window.addEventListener('auth:invalid-token', handleInvalidToken);
    return () => window.removeEventListener('auth:invalid-token', handleInvalidToken);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin(username, password);

      if (response.status === 'ok' && response.token) {
        setUser({
          displayName: response.displayName || response.username || username,
          username: response.username || username,
          disabled: false,
        });
        return { success: true };
      }

      return { success: false, error: response.errorMessage || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
