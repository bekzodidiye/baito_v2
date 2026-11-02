import { create } from 'zustand';
import { safeGetItem, safeSetItem } from '../context/utils';
import { UserProfile } from '../context/types';
import { STORAGE_KEYS, clearAuthStorage, removeStorageItem } from '../constants/storage';

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

export type Language = 'uz' | 'ru' | 'en';

const LANGUAGES: readonly Language[] = ['uz', 'ru', 'en'];

/** The stored language, or Uzbek if it is not one we ship.
 *
 *  This was a cast, not a check: whatever string sat in localStorage became
 *  the app's language. `translations[language]` is then undefined and every
 *  screen that reads a key off it throws on render — a blank app from one
 *  stale key, with no way for the reader to get back. */
const readLanguage = (): Language => {
  const stored = safeGetItem(STORAGE_KEYS.LANGUAGE);
  return LANGUAGES.includes(stored as Language) ? (stored as Language) : 'uz';
};

const initialLanguage = readLanguage();
applyDocumentLanguage(initialLanguage);

export const useAuthStore = create<AuthState>((set) => ({
  language: initialLanguage,
  setLanguage: (lang) => {
    safeSetItem(STORAGE_KEYS.LANGUAGE, lang);
    applyDocumentLanguage(lang);
    set({ language: lang });
  },

  isLoggedIn: safeGetItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true',
  setIsLoggedIn: (loggedIn) => {
    safeSetItem(STORAGE_KEYS.IS_LOGGED_IN, String(loggedIn));
    set({ isLoggedIn: loggedIn });
  },

  userProfile: (() => {
    const cached = safeGetItem(STORAGE_KEYS.USER_PROFILE);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return null;
  })(),
  
  setUserProfile: (profile) => {
    if (profile) {
      safeSetItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } else {
      removeStorageItem(STORAGE_KEYS.USER_PROFILE);
    }
    set({ userProfile: profile });
  },

  clearSession: () => {
    clearAuthStorage();
    set({ userProfile: null, isLoggedIn: false });
  }
}));
