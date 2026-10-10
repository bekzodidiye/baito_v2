import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));

import { AdminOverview } from './AdminOverview';
import { ADMIN_TEXTS } from './admin.i18n';
import { counted } from '../../utils/plural';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const body = () => document.body.textContent ?? '';

const stats = {
  totalUsers: 12, totalJobs: 5, totalApplications: 8,
  completedJobs: 3, totalOwedToWorkers: 1_000_000, revenue: 100_000,
} as never;

/** The sidebar and header already picked by language; the screens behind them
 *  never did, so the panel read half-Russian and half-Uzbek in exactly the way
 *  the rest of the app did. */
describe('Admin panel — the screens follow the sidebar’s language', () => {
  it('translates the overview tiles', () => {
    render(<AdminOverview stats={stats} loading={false} />);
    expect(body()).toContain(ADMIN_TEXTS.ru.usersLabel);
    expect(body()).not.toContain("Ish vaqtida xavfsiz saqlanayotgan mablag'");
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<AdminOverview stats={stats} loading={false} />);
    expect(body()).toContain("Ishchilarga hisoblangan, hali qo'lda to'lanmagan");
  });
});

/** The settings screen told whoever sets the rate that it is deducted from the
 *  worker's wage. It is not, and has not been since the commission was moved
 *  onto the employer: the worker is paid the posted wage in full and the
 *  employer is charged the rate on top of it. Translating that sentence as it
 *  stood would have carried the error into two more languages. */
describe('The commission help text describes the rule the code actually applies', () => {
  it.each(['uz', 'ru', 'en'] as const)('says the employer pays it, in %s', (lang) => {
    const help = ADMIN_TEXTS[lang].platformFeeHelp.toLowerCase();
    const employer = { uz: 'ish beruvchi', ru: 'работодател', en: 'employer' }[lang];
    expect(help).toContain(employer);
  });

  it('no longer says the wage is transferred with the percentage taken out', () => {
    // The exact claim the old copy made.
    expect(ADMIN_TEXTS.uz.platformFeeHelp).not.toContain("shu foiz ayirilgan holda");
  });

  it('still says the rate is pinned at hiring', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(ADMIN_TEXTS[lang].platformFeeHelp.length).toBeGreaterThan(40);
    }
    expect(ADMIN_TEXTS.uz.platformFeeHelp).toContain('saqlanadi');
    expect(ADMIN_TEXTS.ru.platformFeeHelp).toContain('сохраняется');
    expect(ADMIN_TEXTS.en.platformFeeHelp).toContain('kept');
  });
});

describe('ADMIN_TEXTS — the three locales stay in step', () => {
  it('defines the same keys in all three', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(ADMIN_TEXTS.ru)).toEqual(keys(ADMIN_TEXTS.uz));
    expect(keys(ADMIN_TEXTS.en)).toEqual(keys(ADMIN_TEXTS.uz));
  });

  it('leaves no Cyrillic in the English table', () => {
    const cyrillic = Object.entries(ADMIN_TEXTS.en)
      .filter(([, v]) => typeof v === 'string' && /[Ѐ-ӿ]/.test(v))
      .map(([k]) => k);
    expect(cyrillic).toEqual([]);
  });
});

/** Found by walking the deployed panel in Russian. The section headings had
 *  been translated; the filter chips, the status dropdowns and the numbers on
 *  the overview tiles had not — they live in arrays and in interpolated JSX,
 *  which is exactly what a grep-based sweep does not see. */
describe('Status labels and overview tiles follow the language too', () => {
  const STATUS_KEYS = [
    'statusAll', 'statusOpen', 'statusHired', 'statusStarted',
    'statusFinished', 'statusCancelledJob', 'statusCancelledShort',
  ] as const;

  it('translates every job status', () => {
    for (const key of STATUS_KEYS) {
      expect(ADMIN_TEXTS.ru[key]).not.toBe(ADMIN_TEXTS.uz[key]);
      expect(ADMIN_TEXTS.en[key]).not.toBe(ADMIN_TEXTS.uz[key]);
    }
  });

  it('leaves no Uzbek orthography in the Russian status labels', () => {
    for (const key of STATUS_KEYS) {
      expect(ADMIN_TEXTS.ru[key]).not.toMatch(/[o'g']|sh\b/);
    }
  });

  it('translates the overview tile captions', () => {
    for (const key of ['commissionRevenue', 'owedToWorkers'] as const) {
      expect(ADMIN_TEXTS.ru[key]).not.toBe(ADMIN_TEXTS.uz[key]);
    }
  });

  /** The counted ones hold forms rather than one string, because a number in
   *  front of them changes the noun in Russian. Comparing the arrays by
   *  reference would pass on any two arrays, so compare what is in them. */
  it('translates the counted nouns, and gives Russian all three forms', () => {
    for (const key of ['workersShort', 'employersShort', 'postingsShort',
                       'applicationsShort', 'transfersShort'] as const) {
      expect(ADMIN_TEXTS.ru[key].join('|')).not.toBe(ADMIN_TEXTS.uz[key].join('|'));
      expect(ADMIN_TEXTS.ru[key]).toHaveLength(3);
      expect(ADMIN_TEXTS.en[key]).toHaveLength(2);
      expect(ADMIN_TEXTS.uz[key]).toHaveLength(1);
      // Three distinct forms, or the picking is pointless.
      expect(new Set(ADMIN_TEXTS.ru[key]).size).toBe(3);
    }
  });

  it('reads correctly at one, two and five in Russian', () => {
    const w = ADMIN_TEXTS.ru.workersShort;
    expect(counted(1, w, 'ru')).toBe('1 работник');
    expect(counted(2, w, 'ru')).toBe('2 работника');
    expect(counted(8, w, 'ru')).toBe('8 работников');
    expect(counted(8, ADMIN_TEXTS.uz.workersShort, 'uz')).toBe('8 ishchi');
    expect(counted(8, ADMIN_TEXTS.en.workersShort, 'en')).toBe('8 workers');
  });
});

/** The revenue tile read "10% platforma komissiyasi". The commission has not
 *  been a flat 10% since it became the category's rate plus the region's, set
 *  per category in this very panel — so the tile was quoting a number the
 *  system no longer uses, in a language half its readers do not have. */
describe('The revenue tile no longer quotes a rate that is not the rate', () => {
  it.each(['uz', 'ru', 'en'] as const)('names no fixed percentage in %s', (lang) => {
    expect(ADMIN_TEXTS[lang].platformCommissionNote).not.toMatch(/\d\s*%/);
  });

  it('still says what the figure is', () => {
    expect(ADMIN_TEXTS.ru.platformCommissionNote.toLowerCase()).toContain('комисси');
    expect(ADMIN_TEXTS.en.platformCommissionNote.toLowerCase()).toContain('commission');
    expect(ADMIN_TEXTS.uz.platformCommissionNote.toLowerCase()).toContain('komissiya');
  });
});
