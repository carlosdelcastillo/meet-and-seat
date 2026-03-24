import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, department: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get<User>('/auth/me')
        .then(setUser)
        .catch(() => {
          api.clearToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    api.setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, department: string) => {
    const data = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
      department,
    });
    api.setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const updated = await api.get<User>('/auth/me');
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
