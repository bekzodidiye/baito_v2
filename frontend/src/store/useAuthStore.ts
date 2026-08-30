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

/** Keep <html lang> in step with the interface language.

    A screen reader picks its pronunciation rules from this attribute. The
    document was hard-coded to `en` while every string on the page is Uzbek by
    default, so assistive technology read Uzbek text with English phonetics —
    and switching the language in the UI did not change it either. */
const applyDocumentLanguage = (lang: 'uz' | 'ru' | 'en') => {
  try {
    document.documentElement.lang = lang;
  } catch {
    // Nothing renders without a document; never let this break the store.
  }
};

const initialLanguage = (safeGetItem('baito_language') as 'uz' | 'ru' | 'en') || 'uz';
applyDocumentLanguage(initialLanguage);

export const useAuthStore = create<AuthState>((set) => ({
  language: initialLanguage,
  setLanguage: (lang) => {
    safeSetItem('baito_language', lang);
    applyDocumentLanguage(lang);
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
