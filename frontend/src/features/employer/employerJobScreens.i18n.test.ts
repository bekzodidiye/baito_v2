/** No Uzbek, and no invented claim, written straight into the employer screens. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8');

describe('EmployerJobDetailModal', () => {
  const src = read('EmployerJobDetailModal.tsx');

  it('does not hard-code a posting’s badges', () => {
    expect(src).not.toMatch(/#Tezkor|#KunlikTo/);
    expect(src).toContain('perksForJob(job.tags, language)');
  });

  it('does not promise a deadline the posting never states', () => {
    expect(src).not.toContain('12 soat muddatgacha');
  });

  it('answers a Russian reader in Russian', () => {
    // This branch read `language === 'ru' ? 'Workers:'` — the English string,
    // copied across, so the Russian column header was in English.
    const ternaries = [...src.matchAll(/language === 'ru' \? '([^']*)'/g)].map(m => m[1]);
    expect(ternaries.length).toBeGreaterThan(0);
    for (const ru of ternaries) {
      expect(ru, `Russian branch reads ${JSON.stringify(ru)}`).toMatch(/[а-яА-ЯёЁ]/);
    }
  });
});

describe('EmployerJobCard', () => {
  it('renders labels rather than the raw tags', () => {
    const src = read('EmployerJobCard.tsx');
    expect(src).toContain('perksForJob(job.tags, language)');
  });
});
