import { describe, it, expect } from 'vitest';
import { counted, pluralIndex, pluralOf } from './plural';

const WORKER = ['Работник', 'Работника', 'Работников'] as const;
const EN_WORKER = ['worker', 'workers'] as const;
const UZ_WORKER = ['ishchi'] as const;

/** The admin tiles read "8 Работник", "13 Заявка", "9 Перевод" — a count
 *  interpolated straight into a label, which is correct in Uzbek and wrong in
 *  Russian, where the noun follows the last digit and the teens are an
 *  exception. */
describe('Russian picks the form from the last digit', () => {
  it('uses the first form for 1, 21, 101', () => {
    for (const n of [1, 21, 101, 131]) {
      expect(counted(n, WORKER, 'ru')).toBe(`${n} Работник`);
    }
  });

  it('uses the second for 2 to 4, and again at 22 to 24', () => {
    for (const n of [2, 3, 4, 22, 33, 104]) {
      expect(counted(n, WORKER, 'ru')).toBe(`${n} Работника`);
    }
  });

  it('uses the third for 5 to 20, and for 0', () => {
    for (const n of [0, 5, 9, 10, 15, 20, 100]) {
      expect(counted(n, WORKER, 'ru')).toBe(`${n} Работников`);
    }
  });

  it('treats the teens as the exception they are', () => {
    // 11–14 take the third form even though 1–4 do not.
    for (const n of [11, 12, 13, 14, 111, 112]) {
      expect(pluralOf(n, WORKER, 'ru')).toBe('Работников');
    }
  });
});

describe('English has two forms, Uzbek one', () => {
  it('singular only at one', () => {
    expect(counted(1, EN_WORKER, 'en')).toBe('1 worker');
    expect(counted(0, EN_WORKER, 'en')).toBe('0 workers');
    expect(counted(21, EN_WORKER, 'en')).toBe('21 workers');
  });

  it('never inflects after a numeral in Uzbek', () => {
    for (const n of [0, 1, 2, 5, 11, 21]) {
      expect(counted(n, UZ_WORKER, 'uz')).toBe(`${n} ishchi`);
    }
  });

  it('falls back to the first form when a language is given too few', () => {
    expect(pluralOf(5, ['ishchi'], 'ru')).toBe('ishchi');
  });
});

describe('the index itself', () => {
  it('is stable for negative and fractional input rather than throwing', () => {
    expect(pluralIndex(-1, 'ru')).toBe(0);
    expect(pluralIndex(2.7, 'ru')).toBe(1);
  });
});
