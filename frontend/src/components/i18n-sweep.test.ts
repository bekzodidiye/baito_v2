import { describe, it, expect } from 'vitest';
import { uz } from '../translations/uz';
import { ru } from '../translations/ru';
import { en } from '../translations/en';
import { LOCAL_TEXTS } from './login/LoginPromptScreen.translations';

/** The last sweep of the site, done by reading every screen rather than
 *  grepping. What it turned up were labels no word-list could have flagged —
 *  "Baito Uzbekistan" in the sidebar, "Sidebar Menu", "Preview", "Avatar
 *  Preview", "Job Banner", "Oops!" — English and brand strings sitting in a
 *  Russian interface, plus the Uzbek ones the earlier passes had missed
 *  because they were inside props rather than text nodes. */
const SWEPT = [
  'brandCountry', 'sidebarMenu', 'mainNavigation', 'toggleMenu', 'adminPanel',
  'imageLabel', 'fileLabel', 'typingIndicator', 'previewLabel', 'avatarPreview',
  'jobBannerAlt', 'shareLabel', 'copyLabel', 'securityTitle', 'basicProtection',
  'activeSessions', 'liveChatTitle', 'onlineStatus', 'companyAboutPlaceholder',
  'companyNamePlaceholder', 'addressPlaceholder', 'licenceFileAria',
  'passportPhotosLabel', 'selfieFileAria', 'agreeToTerms', 'bonusAmountLabel',
  'mapLoadFailed', 'inProgressStatus', 'oops',
] as const;

describe('The strings the final sweep found exist in all three languages', () => {
  it.each(SWEPT)('%s is defined everywhere', (key) => {
    for (const table of [uz, ru, en]) {
      expect((table as Record<string, string>)[key]?.trim()).toBeTruthy();
    }
  });

  it('gives Russian its own wording, not the Uzbek', () => {
    // "Baito Uzbekistan" is a brand plus a country: the brand stays, the
    // country is translated, so the two are not the same string.
    for (const key of SWEPT) {
      const u = (uz as Record<string, string>)[key];
      const r = (ru as Record<string, string>)[key];
      expect(r, `${key} repeats the Uzbek`).not.toBe(u);
    }
  });

  it('keeps the brand itself in every language', () => {
    for (const table of [uz, ru, en]) {
      expect((table as Record<string, string>).brandCountry).toContain('Baito');
    }
  });

  it('leaves no Cyrillic in the English sweep strings', () => {
    for (const key of SWEPT) {
      expect(/[Ѐ-ӿ]/.test((en as Record<string, string>)[key])).toBe(false);
    }
  });
});

/** The registration flow reads from its own table, so the document labels had
 *  to land there rather than in the shared one. */
describe('The registration documents section is translated too', () => {
  const KEYS = ['orgNamePlaceholder', 'licenceFileAria', 'passportPhotos',
                'selfieFileAria', 'agreeToTermsAria'] as const;

  it.each(KEYS)('%s exists in all three', (key) => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect((LOCAL_TEXTS[lang] as Record<string, string>)[key]?.trim()).toBeTruthy();
    }
  });

  it('does not hand a Russian reader the Uzbek label', () => {
    for (const key of KEYS) {
      expect((LOCAL_TEXTS.ru as Record<string, string>)[key])
        .not.toBe((LOCAL_TEXTS.uz as Record<string, string>)[key]);
    }
  });
});
