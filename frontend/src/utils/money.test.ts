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

  it('formats salary ranges cleanly without concatenating digits', () => {
    const uzRange = formatSalary('1 500 000 - 2 000 000', 'uz');
    expect(uzRange).toContain("so'm");
    expect(uzRange).toContain('–');
    expect(uzRange).not.toContain('15000002000000');

    const ruRange = formatSalary('1500000 - 2000000 UZS', 'ru');
    expect(ruRange).toContain('сум');
    expect(ruRange).toContain('–');

    const withSuffix = formatSalary("250 000 so'm/kun", 'uz');
    expect(withSuffix).toContain('/kun');

    const verbalUz = formatSalary("1 500 000 dan 2 000 000 gacha", 'uz');
    expect(verbalUz).toContain('–');
    expect(verbalUz).toContain("so'm");
    expect(verbalUz).not.toContain('15000002000000');

    const verbalRu = formatSalary("от 1 500 000 до 2 000 000 сум", 'ru');
    expect(verbalRu).toContain('–');
    expect(verbalRu).toContain('сум');
    expect(verbalRu).not.toContain('15000002000000');
  });
});
