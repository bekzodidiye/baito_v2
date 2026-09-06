import { describe, it, expect } from 'vitest';
import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';

/**
 * The three locale files have to stay in step, and nothing was checking that.
 *
 * This is the defect class behind BUG-006 and the earlier settings-screen fix:
 * a key added to one file and forgotten in another does not fail a build, does
 * not fail a type check, and does not fail a test. It fails in front of a user,
 * on whatever screen nobody happened to open in that language.
 */
const locales = { uz, ru, en } as const;

describe('translations', () => {
  const keys = Object.fromEntries(
    Object.entries(locales).map(([name, table]) => [name, Object.keys(table).sort()])
  ) as Record<keyof typeof locales, string[]>;

  it('define exactly the same keys in all three languages', () => {
    expect(keys.ru).toEqual(keys.uz);
    expect(keys.en).toEqual(keys.uz);
  });

  it.each(Object.keys(locales) as (keyof typeof locales)[])(
    'has no empty or whitespace-only string in %s',
    (name) => {
      const blank = Object.entries(locales[name])
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k);
      expect(blank).toEqual([]);
    }
  );

  it('does not leave a Russian or Uzbek string sitting in the English table', () => {
    // Cyrillic is the cheap tell, and it is exactly what BUG-006 looked like:
    // an English interface answering in Russian.
    const cyrillic = Object.entries(en)
      .filter(([, v]) => typeof v === 'string' && /[Ѐ-ӿ]/.test(v))
      .map(([k]) => k);
    expect(cyrillic).toEqual([]);
  });

  it('translates every key rather than copying the Uzbek across', () => {
    // Some keys legitimately match — proper nouns, "Baito", short labels. The
    // check is that the table is not simply a copy, which is how a locale ends
    // up "present" but untranslated.
    const identical = Object.keys(uz).filter(
      (k) => (uz as Record<string, unknown>)[k] === (ru as Record<string, unknown>)[k]
    );
    expect(identical.length).toBeLessThan(Object.keys(uz).length / 2);
  });
});
