import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'viewer';

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'reserved_suites_auth';
const ROLE_KEY = 'reserved_suites_role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(AUTH_KEY);
    const savedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    if (session) {
      setIsAuthenticated(true);
      setRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('login', {
        body: { password },
      });

      if (error || !data?.authenticated) {
        return false;
      }

      const userRole = data.role as UserRole;
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(ROLE_KEY, userRole);
      setIsAuthenticated(true);
      setRole(userRole);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ROLE_KEY);
    setIsAuthenticated(false);
    setRole(null);
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, isAdmin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
