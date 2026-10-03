/** A `language === 'ru' ? …` branch must answer in Russian.
 *
 *  These ternaries are written three strings at a time, and the easy slip is
 *  to copy one branch into the next: the employer's job modal read
 *  `language === 'ru' ? 'Workers:'`, so the Russian column header was in
 *  English. Two `aria-label`s did the same, which a sighted reader never sees
 *  at all — a Russian screen-reader user heard "Category" and an English
 *  example address.
 *
 *  Uzbek and English are Latin-script, so they cannot be told apart this way;
 *  Cyrillic in either of them, and its absence in Russian, can.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
};

const FILES = walk(SRC);
const BRANCH = /language\s*===\s*'(uz|ru|en)'\s*\?\s*(['"])(.*?)\2/gs;
const CYRILLIC = /[а-яА-ЯёЁ]/;
const HAS_LETTERS = /[A-Za-zА-Яа-яЁё]/;
/** Tailwind class soup is not copy and carries no language. */
const CLASS_SOUP = /\b(bg|text|border|hover|rounded|px|py|flex|ring|shadow|w|h)-/;

interface Finding { file: string; line: number; lang: string; value: string; why: string }

const scan = (): Finding[] => {
  const found: Finding[] = [];
  for (const file of FILES) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(BRANCH)) {
      const [lang, value] = [m[1], m[3]];
      if (!value.trim() || !HAS_LETTERS.test(value)) continue;
      if (CLASS_SOUP.test(value)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      const rel = path.relative(SRC, file);
      if (lang === 'ru' && !CYRILLIC.test(value)) {
        // "Email", "Baito", "SMS" and the like are written the same in Russian.
        if (/^[A-Za-z][A-Za-z0-9 .+-]{0,14}$/.test(value) && value.split(' ').length <= 2) {
          const BORROWED = /^(email|sms|baito|id|pdf|url|ok|wi-fi|telegram|github)$/i;
          if (BORROWED.test(value.trim())) continue;
        }
        found.push({ file: rel, line, lang, value, why: 'Russian branch has no Cyrillic' });
      } else if (lang !== 'ru' && CYRILLIC.test(value)) {
        found.push({ file: rel, line, lang, value, why: `${lang} branch is in Cyrillic` });
      }
    }
  }
  return found;
};

/** `language === 'uz' ? A : B` — B is shown to a Russian reader and to an
 *  English one, so one of them is reading the other's language. The payments
 *  screen told an English reader "В ожидании"; the register flow told a
 *  Russian one nothing it could read either way.
 *
 *  The tail of a correct three-way chain looks identical in isolation —
 *  `… : language === 'ru' ? X : Y` — so a test that is itself the else of
 *  another language test is skipped. */
const TWO_WAY = /language\s*===\s*'(uz|ru|en)'\s*\?\s*(['"])(.*?)\2\s*:\s*(['"])(.*?)\4/gs;

const twoWayLeaks = (): string[] => {
  const leaks: string[] = [];
  for (const file of FILES) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(TWO_WAY)) {
      const [a, b] = [m[3], m[5]];
      if (a.includes('language ===') || b.includes('language ===')) continue;
      if (!HAS_LETTERS.test(a) || !HAS_LETTERS.test(b)) continue;
      if (CLASS_SOUP.test(a) || CLASS_SOUP.test(b)) continue;
      if (src.slice(0, m.index).trimEnd().endsWith(':')) continue;
      const line = src.slice(0, m.index).split('\n').length;
      leaks.push(`${path.relative(SRC, file)}:${line}  ${m[1]} -> ${JSON.stringify(a)}` +
                 `, everyone else -> ${JSON.stringify(b)}`);
    }
  }
  return leaks;
};

describe('language ternaries', () => {
  it('scans a realistic number of files and branches', () => {
    expect(FILES.length).toBeGreaterThan(100);
    let branches = 0;
    for (const f of FILES) branches += [...fs.readFileSync(f, 'utf8').matchAll(BRANCH)].length;
    expect(branches).toBeGreaterThan(100);
  });

  it('write a string for every language, not two out of three', () => {
    const leaks = twoWayLeaks();
    expect(leaks, `\n  ${leaks.join('\n  ')}\n`).toEqual([]);
  });

  it('answer in the language they test for', () => {
    const found = scan();
    const report = found.map(f => `${f.file}:${f.line}  ${f.lang} -> ${JSON.stringify(f.value)}  (${f.why})`);
    expect(found, `\n  ${report.join('\n  ')}\n`).toEqual([]);
  });
});
