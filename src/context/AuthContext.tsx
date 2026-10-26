import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, PrivateAccountInfo } from '../types';
import { authService, RegisterParams } from '../services';
import { initializeLocalStorage } from '../repositories/localStorageRepository';

interface AuthContextType {
  user: UserProfile | null;
  privateInfo: PrivateAccountInfo | null;
  isLoading: boolean;
  allUsers: UserProfile[];
  loginWithPhone: (phone: string) => Promise<UserProfile>;
  register: (params: RegisterParams) => Promise<{ user: UserProfile; privateInfo: PrivateAccountInfo }>;
  switchUser: (userId: string) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<PrivateAccountInfo | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const info = await authService.getPrivateAccountInfo();
        setPrivateInfo(info);
      } else {
        setPrivateInfo(null);
      }
      const users = await authService.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Error refreshing auth user', err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        initializeLocalStorage();
        await refreshUser();
      } catch (err) {
        // Browser storage may be unavailable in private/restricted browsing contexts.
        // Never leave the application stuck on its loading screen.
        console.error('Unable to initialize 8ATE local storage', err);
        setUser(null);
        setPrivateInfo(null);
        setAllUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const loginWithPhone = async (phone: string) => {
    const loggedUser = await authService.devLoginWithPhone(phone);
    await refreshUser();
    return loggedUser;
  };

  const register = async (params: RegisterParams) => {
    const result = await authService.register(params);
    await refreshUser();
    return result;
  };

  const switchUser = async (userId: string) => {
    const switched = await authService.devSwitchUser(userId);
    await refreshUser();
    return switched;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = await authService.updateProfile(updates);
    await refreshUser();
    return updated;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setPrivateInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        privateInfo,
        isLoading,
        allUsers,
        loginWithPhone,
        register,
        switchUser,
        updateProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
