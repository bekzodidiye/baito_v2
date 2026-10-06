/** The admin panel's stand-ins for a value the record does not carry.
 *
 *  They were Uzbek literals written into the JSX, so the panel answered in
 *  Uzbek whatever language the administrator had chosen. Two of them did worse
 *  than pick a language: a user with no number on file was shown
 *  `+998 90 123 45 67`, and a user with no region was shown as living in
 *  Toshkent. Both read as facts about that person.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_TEXTS } from './admin.i18n';

const DIR = path.resolve(__dirname);
const FILES = fs.readdirSync(DIR)
  .filter(f => /\.tsx$/.test(f) && !f.includes('.test.'))
  .map(f => path.join(DIR, f));

const LANGS = ['uz', 'ru', 'en'] as const;

const FALLBACK_KEYS = [
  'notEntered', 'notUploaded', 'unknown', 'unknownIp', 'noPhone',
  'jobTypeFallback', 'roleWorker', 'roleEmployer',
  'passportAndIdDocs', 'passportFront', 'passportBack', 'selfieWithPassport',
] as const;

describe('admin fallback copy', () => {
  it.each(LANGS)('defines every fallback in %s', (lang) => {
    for (const key of FALLBACK_KEYS) {
      expect(ADMIN_TEXTS[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });

  it('says something different in each language', () => {
    for (const key of FALLBACK_KEYS) {
      const said = LANGS.map(l => ADMIN_TEXTS[l][key]);
      // Russian and English must not be the Uzbek string copied across.
      expect(new Set(said).size, `${key}: ${said.join(' / ')}`).toBe(3);
    }
  });

  it('carries no Uzbek into the Russian or English copy', () => {
    const uzbek = /\b\w*[oOgG]['’]\w+/;
    for (const lang of ['ru', 'en'] as const) {
      for (const key of FALLBACK_KEYS) {
        expect(ADMIN_TEXTS[lang][key], `${lang}.${key}`).not.toMatch(uzbek);
      }
    }
  });
});

describe('admin screens', () => {
  it('invents no phone number for a user who has none on file', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = fs.readFileSync(file, 'utf8');
      // A literal number after `||` is a stand-in presented as real. The
      // placeholder attribute on an input is a different thing and allowed.
      for (const m of src.matchAll(/\|\|\s*'(\+998[^']*)'/g)) {
        offenders.push(`${path.basename(file)}: ${m[1]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('claims no region for a user who entered none', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\|\|\s*'(Toshkent[^']*)'/g)) {
        offenders.push(`${path.basename(file)}: ${m[1]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('leaves no Uzbek literal standing in for a missing value', () => {
    const banned = /\|\|\s*'(Kiritilmagan|Noma\\?'lum[^']*|Yuklanmagan|Ishchi|Ish beruvchi|Ish turi)'/g;
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(banned)) {
        offenders.push(`${path.basename(file)}: ${m[1]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('scans a realistic number of admin screens', () => {
    expect(FILES.length).toBeGreaterThan(15);
  });
});
