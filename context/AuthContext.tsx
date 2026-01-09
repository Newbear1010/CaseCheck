
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initial state: Simulated "Not Logged In"
    return null;
  });

  const login = (role: Role) => {
    // Added missing 'status' property to each mock user to match the User interface
    const mockUsers: Record<Role, User> = {
      [Role.ADMIN]: { id: 'admin-1', name: 'Alex Admin', email: 'admin@corp.com', role: Role.ADMIN, department: 'IT Governance', status: 'ACTIVE' },
      [Role.USER]: { id: 'user-1', name: 'Jane User', email: 'jane@corp.com', role: Role.USER, department: 'Marketing', status: 'ACTIVE' },
      [Role.GUEST]: { id: 'guest-1', name: 'Guest Visitor', email: 'guest@external.com', role: Role.GUEST, department: 'Visitor', status: 'ACTIVE' },
    };
    setUser(mockUsers[role]);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
