import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, role?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('medai_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('medai_token'));

  const login = (email: string, role: string = 'researcher') => {
    const dummyUser = { id: 'usr-demo-1', email, role };
    const dummyToken = 'demo-jwt-token-123';
    setUser(dummyUser);
    setToken(dummyToken);
    localStorage.setItem('medai_user', JSON.stringify(dummyUser));
    localStorage.setItem('medai_token', dummyToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('medai_user');
    localStorage.removeItem('medai_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
