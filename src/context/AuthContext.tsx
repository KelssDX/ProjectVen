import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserType } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'demo@businesshub.com',
    firstName: 'Demo',
    lastName: 'User',
    userType: 'entrepreneur',
    avatar: '/avatar-1.jpg',
    isVerified: true,
    verification: {
      level: 'trusted',
      badges: ['entrepreneur', 'seller', 'buyer'],
      venScore: 4.7,
      businessScore: 86,
    },
    createdAt: new Date(),
  },
  {
    id: '2',
    email: 'sarah@techstart.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    userType: 'sme',
    avatar: '/avatar-1.jpg',
    isVerified: true,
    verification: {
      level: 'verified',
      badges: ['company', 'seller'],
      venScore: 4.5,
      businessScore: 78,
    },
    createdAt: new Date(),
  },
  {
    id: '3',
    email: 'michael@greenenergy.com',
    firstName: 'Michael',
    lastName: 'Chen',
    userType: 'investor',
    avatar: '/avatar-2.jpg',
    isVerified: true,
    verification: {
      level: 'verified',
      badges: ['investor'],
      venScore: 4.2,
      businessScore: 72,
    },
    createdAt: new Date(),
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('businesshub_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find user (mock authentication - password not checked in demo)
    const foundUser = MOCK_USERS.find(u => u.email === email);
    
    if (!foundUser) {
      throw new Error('Invalid email or password');
    }
    
    // Save to localStorage
    localStorage.setItem('businesshub_user', JSON.stringify(foundUser));
    setUser(foundUser);
    setIsLoading(false);
  }, []);

  const register = useCallback(async (_data: RegisterData) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create new user (password is handled by backend in real app)
    const newUser: User = {
      id: String(Date.now()),
      email: _data.email,
      firstName: _data.firstName,
      lastName: _data.lastName,
      userType: _data.userType,
      isVerified: false,
      verification: {
        level: 'basic',
        badges: ['buyer'],
        venScore: 0,
        businessScore: 0,
      },
      createdAt: new Date(),
    };
    
    // Save to localStorage
    localStorage.setItem('businesshub_user', JSON.stringify(newUser));
    setUser(newUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('businesshub_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      localStorage.setItem('businesshub_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  }, [user]);

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

export default AuthContext;
