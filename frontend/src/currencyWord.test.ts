/** The word after a sum follows the reader, like every other word.
 *
 *  It was written into the JSX as `so'm` in a dozen rendered places, beside a
 *  dozen slightly different local formatters. A Russian reader met "1 000
 *  so'm" on the finish-job modal, in their wallet, and on every admin payout
 *  screen.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) out.push(full);
  }
  return out;
};

/** Files where an Uzbek `so'm` is the right answer: the Uzbek half of a
 *  translation table, a pattern matching what the backend wrote, the helper
 *  that owns the word, and the standalone invoice page, which is opened from
 *  a billing email by someone who may never have used the app. */
const ALLOWED = new Set([
  'notificationTranslator.ts', 'apiErrorTranslator.ts', 'money.ts',
  'uz.ts', 'LandingData.ts', 'LandingTestimonials.content.ts',
  'ProfileScreen.utils.ts', 'admin.i18n.ts', 'useLandingCategories.ts',
  'LoginPromptScreen.translations.uz.ts', 'InvoicePayScreen.tsx',
  // Its `so'm` sits in the Uzbek branch of a three-language object; the
  // Russian and English branches beside it carry сум and UZS.
  'ApplicantCard.tsx',
  // A slider's default, in a comment beside the number.
  'LandingIncomeCalculator.tsx',
]);

const isComment = (line: string) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

/** A line that picks the word by language, or only reads one, is fine. */
const isLanguageAware = (line: string) =>
  /language\s*===|'uz':|\buz:\s|\.includes\(/.test(line);

describe('the currency word', () => {
  it('is never written into a rendered string as Uzbek', () => {
    const leaks: string[] = [];
    for (const file of walk(SRC)) {
      if (ALLOWED.has(path.basename(file))) continue;
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (!line.includes("so'm")) return;
        if (isComment(line) || isLanguageAware(line)) return;
        leaks.push(`${path.relative(SRC, file)}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
    }
    expect(leaks, `\n  ${leaks.join('\n  ')}\n`).toEqual([]);
  });

  it('scans a realistic number of files', () => {
    expect(walk(SRC).length).toBeGreaterThan(100);
  });
});
