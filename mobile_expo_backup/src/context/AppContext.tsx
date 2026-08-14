import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile } from '../types';

interface AppContextType {
  language: 'uz' | 'ru' | 'en';
  setLanguage: (lang: 'uz' | 'ru' | 'en') => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthStore();

  useEffect(() => {
    // Ilovani birinchi marta yoqqanda AsyncStorage'dan ma'lumotlarni o'qiymiz
    if (!authState.isInitialized) {
      authState.initialize();
    }
  }, [authState.isInitialized]);

  const logout = useCallback(async () => {
    await authState.clearSession();
  }, [authState]);

  const value: AppContextType = useMemo(() => ({
    language: authState.language,
    setLanguage: authState.setLanguage,
    isLoggedIn: authState.isLoggedIn,
    setIsLoggedIn: authState.setIsLoggedIn,
    userProfile: authState.userProfile,
    setUserProfile: authState.setUserProfile,
    logout,
  }), [authState, logout]);

  // Agar holat hali o'qilmagan bo'lsa (Loading holati)
  if (!authState.isInitialized) {
    return null; // Yoki shu yerga LoadingSpinner qo'yish mumkin
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
