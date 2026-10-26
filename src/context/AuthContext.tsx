import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, PrivateAccountInfo } from '../types';
import { authService, RegisterParams } from '../services';
import { initializeLocalStorage } from '../repositories/localStorageRepository';

interface AuthContextType {
  user: UserProfile | null;
  privateInfo: PrivateAccountInfo | null;
  isLoading: boolean;
  storageError: string | null;
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
  const [storageError, setStorageError] = useState<string | null>(null);

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
      setStorageError(null);
    } catch (err) {
      console.error('Error refreshing auth user', err);
      setStorageError('Some saved browser data could not be read. Avoid making changes until the data is recovered or reset.');
    }
  };

  useEffect(() => {
    try {
      initializeLocalStorage();
    } catch (err) {
      console.error('Local demo storage could not initialize', err);
    }
    refreshUser().finally(() => setIsLoading(false));
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
    try {
      await authService.logout();
    } catch (err) {
      console.error('Could not persist demo logout; clearing the in-memory session anyway.', err);
      setStorageError('The browser could not clear the saved demo session. Reload and check local storage before using this browser again.');
    } finally {
      setUser(null);
      setPrivateInfo(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        privateInfo,
        isLoading,
        storageError,
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
