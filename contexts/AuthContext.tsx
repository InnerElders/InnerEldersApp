import React, { createContext, useContext, useState, useEffect } from 'react';
import { authController } from '@/db/controllers/authController';

export interface UserSession {
  rut: string;
  role: 'adulto_mayor' | 'cuidador' | 'medico';
  nombres: string;
}

interface AuthContextType {
  userSession: UserSession | null;
  isLoading: boolean;
  login: (rut: string, psswd: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => void;
  updateSessionName: (newName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (rut: string, psswd: string) => {
    setIsLoading(true);
    try {
      // Validate credentials using the SQLite auth controller
      const session = await authController.authenticateUser(rut, psswd);
      
      if (session) {
        setUserSession(session);
        setIsLoading(false);
        return { success: true, role: session.role };
      } else {
        setIsLoading(false);
        return { success: false, error: 'Credenciales incorrectas' };
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setIsLoading(false);
      return { success: false, error: 'Ocurrió un error al iniciar sesión' };
    }
  };

  const logout = () => {
    setUserSession(null);
  };

  const updateSessionName = (newName: string) => {
    if (userSession) {
      setUserSession({ ...userSession, nombres: newName });
    }
  };

  return (
    <AuthContext.Provider value={{ userSession, isLoading, login, logout, updateSessionName }}>
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
