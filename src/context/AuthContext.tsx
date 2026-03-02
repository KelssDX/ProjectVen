import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, type AuthSession } from '@/api/auth';
import { setApiClientAuth } from '@/api/http';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setSessionTokens,
} from '@/api/session';
import type { User, UserType } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

type RegisterUserType = Exclude<UserType, 'admin'>;

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: RegisterUserType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthUserToUser(authUser: AuthSession['user']): User {
  return {
    id: authUser.id,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    userType: authUser.userType,
    isVerified: authUser.isVerified,
    verification: {
      level: authUser.verificationLevel,
      badges: authUser.isVerified ? ['buyer'] : [],
      venScore: 0,
      businessScore: 0,
    },
    createdAt: new Date(),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Authentication request failed.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFromStoredToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSessionTokens();
      setUser(null);
      return null;
    }

    try {
      const { data } = await authApi.refresh(refreshToken);
      setSessionTokens(data.tokens);
      setUser(mapAuthUserToUser(data.user));
      return data.tokens.accessToken;
    } catch {
      clearSessionTokens();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setApiClientAuth({
      getToken: () => getAccessToken(),
      refreshToken: refreshFromStoredToken,
    });
  }, [refreshFromStoredToken]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      setIsLoading(true);
      await refreshFromStoredToken();
      if (mounted) {
        setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshFromStoredToken]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setSessionTokens(data.tokens);
      setUser(mapAuthUserToUser(data.user));
    } catch (error) {
      throw new Error(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterData) => {
    setIsLoading(true);
    try {
      const { data } = await authApi.register(payload);
      setSessionTokens(data.tokens);
      setUser(mapAuthUserToUser(data.user));
    } catch (error) {
      throw new Error(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      clearSessionTokens();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((previousUser) =>
      previousUser ? { ...previousUser, ...data } : previousUser,
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
