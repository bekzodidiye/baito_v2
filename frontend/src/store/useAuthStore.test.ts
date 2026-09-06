import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Two things here are easy to break and hard to notice.
 *
 * `<html lang>` was hard-coded to `en` while every string on the page was
 * Uzbek, so a screen reader read Uzbek with English phonetics — and switching
 * language in the UI did not change it. That is now the store's job.
 *
 * And the store reads localStorage at module load, which is why each test
 * re-imports it rather than sharing one instance.
 */
const freshStore = async () => {
  vi.resetModules();
  const mod = await import('./useAuthStore');
  return mod.useAuthStore;
};

describe('useAuthStore language', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('starts in Uzbek when nothing has been chosen', async () => {
    const store = await freshStore();
    expect(store.getState().language).toBe('uz');
  });

  it('restores the language chosen last time', async () => {
    localStorage.setItem('baito_language', 'ru');
    const store = await freshStore();
    expect(store.getState().language).toBe('ru');
  });

  it('puts the restored language on the document at load', async () => {
    localStorage.setItem('baito_language', 'en');
    await freshStore();
    expect(document.documentElement.lang).toBe('en');
  });

  it.each(['uz', 'ru', 'en'] as const)('keeps <html lang> in step when switching to %s', async (lang) => {
    const store = await freshStore();

    // Importing the store already stamps the initial language, so switching to
    // that same language would pass without the setter doing anything. Park the
    // attribute on a value nothing would produce, so all three cases mean the
    // same thing.
    document.documentElement.lang = 'zz';

    store.getState().setLanguage(lang);
    expect(store.getState().language).toBe(lang);
    expect(document.documentElement.lang).toBe(lang);
    expect(localStorage.getItem('baito_language')).toBe(lang);
  });
});

describe('useAuthStore session flag', () => {
  beforeEach(() => localStorage.clear());

  it('is signed out by default', async () => {
    const store = await freshStore();
    expect(store.getState().isLoggedIn).toBe(false);
  });

  it('treats only the exact string "true" as signed in', async () => {
    // Anything looser and a stale or garbled value reads as a session, which is
    // how the app ends up believing it is logged in and taking 401s all day.
    localStorage.setItem('baito_is_logged_in', 'yes');
    expect((await freshStore()).getState().isLoggedIn).toBe(false);

    localStorage.setItem('baito_is_logged_in', 'true');
    expect((await freshStore()).getState().isLoggedIn).toBe(true);
  });

  it('records the flag when it changes', async () => {
    const store = await freshStore();
    store.getState().setIsLoggedIn(true);
    expect(localStorage.getItem('baito_is_logged_in')).toBe('true');
    store.getState().setIsLoggedIn(false);
    expect(localStorage.getItem('baito_is_logged_in')).toBe('false');
  });
});
