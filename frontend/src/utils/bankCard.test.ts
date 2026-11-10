import { describe, it, expect } from 'vitest';
import { cardDigits, formatCard, schemeOf, schemeName, cardProblem, maskCard } from './bankCard';

const UZCARD = '8600123456789012';
const HUMO = '9860123456789012';

describe('a payout card', () => {
  it('keeps only digits, and at most sixteen', () => {
    expect(cardDigits('8600 1234 5678 9012')).toBe(UZCARD);
    expect(cardDigits('8600-1234-5678-9012-3456')).toBe(UZCARD);
    expect(cardDigits('abc')).toBe('');
  });

  it('reads back in groups of four', () => {
    expect(formatCard(UZCARD)).toBe('8600 1234 5678 9012');
    expect(formatCard('86001')).toBe('8600 1');
    expect(formatCard('')).toBe('');
  });

  it('knows the two schemes that can be paid to', () => {
    // Only domestic UzCard (8600) and Humo (9860) BINs are supported for direct payout
    expect(schemeOf(UZCARD)).toBe('uzcard');
    expect(schemeOf(HUMO)).toBe('humo');
    expect(schemeOf('4276123456789012')).toBeNull();
    expect(schemeName(UZCARD)).toBe('UzCard');
    expect(schemeName(HUMO)).toBe('Humo');
    expect(schemeName('4276123456789012')).toBeNull();
  });

  it('does not call an empty field an error', () => {
    // A worker who has not been paid yet has no reason to fill it in.
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(cardProblem('', lang)).toBeNull();
      expect(cardProblem('   ', lang)).toBeNull();
    }
  });

  it('says what is wrong, in the reader’s language', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(cardProblem('8600 1234', lang), lang).toBeTruthy();
      expect(cardProblem('4276123456789012', lang), lang).toBeTruthy();
      expect(cardProblem(UZCARD, lang), lang).toBeNull();
      expect(cardProblem(HUMO, lang), lang).toBeNull();
    }
    expect(cardProblem('8600 1234', 'ru')).toMatch(/[а-яА-Я]/);
    expect(cardProblem('4276123456789012', 'ru')).toMatch(/[а-яА-Я]/);
  });

  it('shows the middle as stars once it is complete', () => {
    expect(maskCard(UZCARD)).toBe('8600 **** **** 9012');
    // A half-typed number is not masked into something unreadable.
    expect(maskCard('86001234')).toBe('8600 1234');
  });
});
