import { describe, it, expect } from 'vitest';
import { FAQ_ITEMS } from './LandingData';

/** FAQ_ITEMS carried qUz/qRu and aUz/aRu and nothing else, and the component
 *  chose with `language === 'ru' ? ru : uz`. So an English reader got the
 *  Uzbek question and the Uzbek answer — under an English heading, since the
 *  section's own badge and subtitle were translated. */
describe('The FAQ answers in all three languages', () => {
  it('gives every entry a question in each', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.qUz?.trim()).toBeTruthy();
      expect(item.qRu?.trim()).toBeTruthy();
      expect(item.qEn?.trim()).toBeTruthy();
    }
  });

  it('gives every entry an answer in each', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.aUz?.trim()).toBeTruthy();
      expect(item.aRu?.trim()).toBeTruthy();
      expect(item.aEn?.trim()).toBeTruthy();
    }
  });

  it('does not simply repeat the Uzbek in the other two', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.qEn).not.toBe(item.qUz);
      expect(item.qRu).not.toBe(item.qUz);
      expect(item.aEn).not.toBe(item.aUz);
    }
  });

  it('leaves no Cyrillic in the English entries', () => {
    for (const item of FAQ_ITEMS) {
      expect(/[Ѐ-ӿ]/.test(item.qEn)).toBe(false);
      expect(/[Ѐ-ӿ]/.test(item.aEn)).toBe(false);
    }
  });

  it('leaves no Uzbek apostrophe forms in the English entries', () => {
    for (const item of FAQ_ITEMS) {
      expect(item.qEn).not.toMatch(/\bo'|g'/);
      expect(item.aEn).not.toMatch(/\bo'|g'/);
    }
  });
});
