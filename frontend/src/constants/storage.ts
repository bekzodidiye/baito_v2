/**
 * Centralized LocalStorage keys and typed helpers for Baito.
 * 
 * Prevents key collision, inconsistent naming, and un-prefixed keys across
 * the application. All persisted keys MUST be registered here.
 */

export const STORAGE_KEYS = {
  LANGUAGE: 'baito_language',
  IS_LOGGED_IN: 'baito_is_logged_in',
  USER_PROFILE: 'baito_user_profile',
  PRESELECTED_ROLE: 'baito_preselected_role',
  PRIVACY_CONSENT: 'baito_privacy_consent',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const getStorageItem = (key: StorageKey): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[Storage] Failed to read ${key}:`, e);
    return null;
  }
};

export const setStorageItem = (key: StorageKey, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Storage] Failed to write ${key}:`, e);
  }
};

export const removeStorageItem = (key: StorageKey): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] Failed to remove ${key}:`, e);
  }
};

export const clearAuthStorage = (): void => {
  removeStorageItem(STORAGE_KEYS.IS_LOGGED_IN);
  removeStorageItem(STORAGE_KEYS.USER_PROFILE);
};
