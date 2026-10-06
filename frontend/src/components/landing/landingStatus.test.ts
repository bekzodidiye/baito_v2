import { describe, it, expect } from 'vitest';
import { LANDING_TEXTS } from './LandingData';

/** Found on the deployed site with the language set to English: the map
 *  preview's shift card read "AKTIV" beside an otherwise English panel.
 *
 *  The badge was baked into the shift objects as a literal when they were
 *  built — `badge: j.urgent ? 'Tezkor' : 'Aktiv'` — so no amount of
 *  translating the render could reach it, and the render's own fallback was a
 *  third Uzbek literal. The state is derived at render time now. */
describe('The shift status badges exist in all three languages', () => {
  const KEYS = ['statusActive', 'statusUrgent', 'mapPlanned', 'heroShiftBadge'] as const;

  it('defines each one everywhere', () => {
    for (const key of KEYS) {
      for (const lang of ['uz', 'ru', 'en'] as const) {
        expect(LANDING_TEXTS[lang][key]?.trim()).toBeTruthy();
      }
    }
  });

  it('does not answer in Uzbek to the other two', () => {
    for (const key of KEYS) {
      expect(LANDING_TEXTS.ru[key]).not.toBe(LANDING_TEXTS.uz[key]);
      expect(LANDING_TEXTS.en[key]).not.toBe(LANDING_TEXTS.uz[key]);
    }
  });

  it('leaves no Cyrillic in the English badges', () => {
    for (const key of KEYS) {
      expect(/[Ѐ-ӿ]/.test(LANDING_TEXTS.en[key])).toBe(false);
    }
  });

  it('tells urgent and ordinary apart, or the branch is pointless', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(LANDING_TEXTS[lang].statusUrgent).not.toBe(LANDING_TEXTS[lang].statusActive);
    }
  });
});
