/** The interface language comes out of localStorage, which anything can write.
 *
 *  It used to be cast straight to the union. A value we do not ship — left by
 *  an older build, another app on the same origin, or a hand edit — became the
 *  language, `translations[language]` came back undefined, and every screen
 *  that read a key off it threw on render.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const store: Record<string, string> = {};
vi.mock('../context/utils', () => ({
  safeGetItem: (k: string) => store[k] ?? null,
  safeSetItem: (k: string, v: string) => { store[k] = v; },
  safeRemoveItem: (k: string) => { delete store[k]; },
}));

const load = async () => {
  vi.resetModules();
  return (await import('./useAuthStore')).useAuthStore.getState();
};

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });
afterEach(() => { vi.resetModules(); });

describe('the stored interface language', () => {
  it.each(['uz', 'ru', 'en'])('is kept when it is one we ship: %s', async (lang) => {
    store.baito_language = lang;
    expect((await load()).language).toBe(lang);
  });

  it.each(['de', 'RU', '', 'uz ', 'null', '{"lang":"ru"}'])(
    'falls back to Uzbek for %j', async (bad) => {
      store.baito_language = bad;
      expect((await load()).language).toBe('uz');
    });

  it('falls back to Uzbek when nothing is stored', async () => {
    expect((await load()).language).toBe('uz');
  });

  it('gives the shared table a real entry for whatever it returns', async () => {
    // The crash was one dereference downstream of this value.
    store.baito_language = 'de';
    const { translations } = await import('../translations');
    expect(translations[(await load()).language]).toBeTruthy();
  });
});
