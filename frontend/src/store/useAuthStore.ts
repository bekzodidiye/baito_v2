import { create } from 'zustand';
import { safeGetItem, safeSetItem } from '../context/utils';
import { UserProfile } from '../context/types';

interface AuthState {
  language: 'uz' | 'ru' | 'en';
  setLanguage: (lang: 'uz' | 'ru' | 'en') => void;
  
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  language: (safeGetItem('baito_language') as 'uz' | 'ru' | 'en') || 'uz',
  setLanguage: (lang) => {
    safeSetItem('baito_language', lang);
    set({ language: lang });
  },

  isLoggedIn: safeGetItem('baito_is_logged_in') === 'true',
  setIsLoggedIn: (loggedIn) => {
    safeSetItem('baito_is_logged_in', String(loggedIn));
    set({ isLoggedIn: loggedIn });
  },

  userProfile: (() => {
    const cached = safeGetItem('baito_user_profile');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  })(),
  
  setUserProfile: (profile) => {
    if (profile) {
      safeSetItem('baito_user_profile', JSON.stringify(profile));
    } else {
      try { localStorage.removeItem('baito_user_profile'); } catch (e) {}
    }
    set({ userProfile: profile });
  },

  clearSession: () => {
    try {
      localStorage.removeItem('baito_user_profile');
      localStorage.removeItem('baito_is_logged_in');
    } catch (e) {}
    set({ userProfile: null, isLoggedIn: false });
  }
}));
