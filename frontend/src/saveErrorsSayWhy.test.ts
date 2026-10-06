/** When a save fails, the reader is told why.
 *
 *  `apiClient` puts the server's own `detail` on the error it throws. A worker
 *  saving a profile with an email another account already uses got
 *  "Error occurred" — in English, on a Russian screen — while the server had
 *  said "Bu email allaqachon ro'yxatdan o'tgan". There was nothing to act on,
 *  and no way to guess which of eight fields was the problem.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname);
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Code only: a comment explaining the old string is not the old string. */
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The two screens that save a profile. */
const SAVERS = [
  'hooks/useProfileScreen.ts',
  'features/employer/EmployerEditProfileModal.tsx',
];

describe('a failed profile save', () => {
  it.each(SAVERS)('shows what the server said, in %s', (rel) => {
    const src = code(rel);
    // Either the shared helper, or the message read off the caught error.
    expect(src).toMatch(/reasonFor\(err\)|err instanceof Error \? err\.message/);
  });

  it.each(SAVERS)('never falls back to a bare English string in %s', (rel) => {
    const src = code(rel);
    expect(src).not.toMatch(/["']Error occurred["']|["']An error occurred["']/);
    expect(src).not.toMatch(/["']Failed to upload photo["']/);
  });

  it('falls back to a phrase that exists in all three languages', () => {
    for (const lang of ['uz', 'ru', 'en']) {
      const table = read(`translations/${lang}.ts`);
      expect(table, lang).toMatch(/somethingWentWrong:/);
      expect(table, lang).toMatch(/photoSaved:/);
    }
  });

  it('says it differently in each language', () => {
    const say = (lang: string, key: string) =>
      read(`translations/${lang}.ts`).match(new RegExp(`${key}:\\s*["'](.*?)["']`))?.[1];
    for (const key of ['somethingWentWrong', 'photoSaved']) {
      const said = ['uz', 'ru', 'en'].map(l => say(l, key));
      expect(new Set(said).size, `${key}: ${said.join(' / ')}`).toBe(3);
      expect(said[1], `ru.${key}`).toMatch(/[а-яА-ЯёЁ]/);
    }
  });
});
