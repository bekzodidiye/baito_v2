import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

interface AuthState {
  language: 'uz' | 'ru' | 'en';
  setLanguage: (lang: 'uz' | 'ru' | 'en') => void;
  
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  
  isInitialized: boolean;
  initialize: () => Promise<void>;
  
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  language: 'uz',
  isLoggedIn: false,
  userProfile: null,
  isInitialized: false,

  setLanguage: (lang) => {
    AsyncStorage.setItem('baito_language', lang).catch(() => {});
    set({ language: lang });
  },

  setIsLoggedIn: (loggedIn) => {
    AsyncStorage.setItem('baito_is_logged_in', String(loggedIn)).catch(() => {});
    set({ isLoggedIn: loggedIn });
  },
  
  setUserProfile: (profile) => {
    if (profile) {
      AsyncStorage.setItem('baito_user_profile', JSON.stringify(profile)).catch(() => {});
    } else {
      AsyncStorage.removeItem('baito_user_profile').catch(() => {});
    }
    set({ userProfile: profile });
  },

  initialize: async () => {
    try {
      const [lang, loggedIn, profileStr] = await Promise.all([
        AsyncStorage.getItem('baito_language'),
        AsyncStorage.getItem('baito_is_logged_in'),
        AsyncStorage.getItem('baito_user_profile'),
      ]);

      const updates: Partial<AuthState> = { isInitialized: true };
      
      if (lang === 'uz' || lang === 'ru' || lang === 'en') {
        updates.language = lang;
      }
      
      if (loggedIn === 'true') {
        updates.isLoggedIn = true;
      }

      if (profileStr) {
        try {
          updates.userProfile = JSON.parse(profileStr);
        } catch (e) {}
      }

      set(updates);
    } catch (e) {
      set({ isInitialized: true });
    }
  },

  clearSession: async () => {
    try {
      await AsyncStorage.multiRemove(['baito_user_profile', 'baito_is_logged_in']);
    } catch (e) {}
    set({ userProfile: null, isLoggedIn: false });
  }
}));
