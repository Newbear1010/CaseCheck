
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Role } from '../types';
import authService, { ApiUser } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapApiUser = (apiUser: ApiUser): User => {
    const primaryRole = apiUser.roles?.[0]?.name ?? Role.USER;
    return {
      id: apiUser.id,
      name: apiUser.full_name,
      email: apiUser.email,
      role: primaryRole as Role,
      department: apiUser.department || '',
      status: apiUser.is_active ? 'ACTIVE' : 'INACTIVE',
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!authService.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const apiUser = await authService.getCurrentUser();
        setUser(mapApiUser(apiUser));
      } catch {
        await authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    await authService.login({ username, password });
    const apiUser = await authService.getCurrentUser();
    setUser(mapApiUser(apiUser));
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
