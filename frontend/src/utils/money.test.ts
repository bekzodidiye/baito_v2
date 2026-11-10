import { describe, it, expect } from 'vitest';
import { money, amount, CURRENCY, formatSalary } from './money';

describe('a sum of money', () => {
  it('names the currency in the reader’s language', () => {
    expect(money(1000, 'uz')).toContain("so'm");
    expect(money(1000, 'ru')).toContain('сум');
    expect(money(1000, 'en')).toContain('UZS');
  });

  it('never shows Uzbek to a Russian or English reader', () => {
    for (const l of ['ru', 'en'] as const) {
      expect(money(250000, l), l).not.toMatch(/so'm/);
    }
  });

  it('groups the digits', () => {
    // The separator is a non-breaking space, so a figure does not wrap.
    expect(amount(1000000, 'ru').replace(/ /g, ' ')).toBe('1 000 000');
    expect(amount(1000, 'uz').replace(/ /g, ' ')).toBe('1 000');
    expect(amount(999, 'en')).toBe('999');
  });

  it('falls back to Uzbek for a language it does not ship', () => {
    expect(money(1000, 'de')).toContain("so'm");
    expect(money(1000, '')).toContain("so'm");
  });

  it('survives a value that is not a number', () => {
    for (const bad of [null, undefined, 'abc', NaN, {}]) {
      expect(() => money(bad, 'ru')).not.toThrow();
      expect(amount(bad, 'ru')).toBe('0');
    }
  });

  it('says something different in each language', () => {
    expect(new Set(Object.values(CURRENCY)).size).toBe(3);
  });

  it('formats raw or messy salary strings in the reader language', () => {
    // Strips extraneous symbols while ensuring correct locale currency affix
    expect(formatSalary('240000', 'uz')).toContain("so'm");
    expect(formatSalary('240000 UZS', 'ru')).toContain('сум');
    expect(formatSalary('240 000 so\'m', 'en')).toContain('UZS');
    expect(formatSalary('', 'uz')).toBe('');
    expect(formatSalary(null, 'uz')).toBe('');
  });
});
