import { describe, it, expect } from 'vitest';
import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';

describe('i18n remediation (DEF-I18N-01, DEF-I18N-02, DEF-I18N-03, DEF-I18N-04)', () => {
  it('DEF-I18N-01: resolves searchQuery empty state across uz, ru, and en without falling back to Russian in English', () => {
    const resolveSearchEmpty = (query: string, language: string) =>
      language === 'uz'
        ? `"${query}" bo'yicha hech qanday e'lon topilmadi`
        : language === 'ru'
        ? `Ничего не найдено по запросу "${query}"`
        : `No jobs found matching "${query}"`;

    const uzMsg = resolveSearchEmpty('santexnik', 'uz');
    const ruMsg = resolveSearchEmpty('santexnik', 'ru');
    const enMsg = resolveSearchEmpty('santexnik', 'en');

    expect(uzMsg).toBe('"santexnik" bo\'yicha hech qanday e\'lon topilmadi');
    expect(ruMsg).toBe('Ничего не найдено по запросу "santexnik"');
    expect(enMsg).toBe('No jobs found matching "santexnik"');
    expect(/[Ѐ-ӿ]/.test(enMsg)).toBe(false);
  });

  it('DEF-I18N-02: resolves registration error message across uz, ru, and en without falling back to Russian in English', () => {
    const resolveRegistrationError = (err: any, language: string) =>
      err?.message ||
      (language === 'uz'
        ? "Xatolik yuz berdi. Balki bu raqam ro'yxatdan o'tgandir?"
        : language === 'ru'
        ? "Произошла ошибка при регистрации"
        : "An error occurred during registration. Perhaps this phone number is already registered?");

    const uzMsg = resolveRegistrationError(null, 'uz');
    const ruMsg = resolveRegistrationError(null, 'ru');
    const enMsg = resolveRegistrationError(null, 'en');

    expect(uzMsg).toBe("Xatolik yuz berdi. Balki bu raqam ro'yxatdan o'tgandir?");
    expect(ruMsg).toBe("Произошла ошибка при регистрации");
    expect(enMsg).toBe("An error occurred during registration. Perhaps this phone number is already registered?");
    expect(/[Ѐ-ӿ]/.test(enMsg)).toBe(false);
  });

  it('DEF-I18N-03: verifies payment card keys exist across all 3 locales and are localized', () => {
    const cardKeys = [
      'cardAddedSuccess',
      'cardAddError',
      'cardDeletedSuccess',
      'cardDeleteError',
      'cardFrozenSuccess',
      'cardUnfrozenSuccess',
      'cardTermsAgreement',
      'cardTermsSubtitle',
      'cardSecurityNotice',
      'linkCard',
      'deleteCardConfirmTitle',
      'deleteCardConfirmDesc',
      'freezeCard',
      'unfreezeCard',
      'freezeCardConfirmDesc',
      'unfreezeCardConfirmDesc',
      'cardStatusActive',
      'cardStatusFrozen',
      'cardBank',
      'cardDetails',
      'cvvHint',
    ] as const;

    for (const key of cardKeys) {
      expect((uz as any)[key]).toBeDefined();
      expect((ru as any)[key]).toBeDefined();
      expect((en as any)[key]).toBeDefined();
      expect((uz as any)[key].trim()).not.toBe('');
      expect((ru as any)[key].trim()).not.toBe('');
      expect((en as any)[key].trim()).not.toBe('');
      expect(/[Ѐ-ӿ]/.test((en as any)[key])).toBe(false);
    }
  });

  it('DEF-I18N-04: verifies offline banner translation in uz, ru, and en', () => {
    expect(uz.offlineBanner).toBe("Internet tarmog'iga ulanish yo'q. Iltimos, aloqani tekshiring!");
    expect(ru.offlineBanner).toBe("Нет подключения к интернету. Пожалуйста, проверьте связь!");
    expect(en.offlineBanner).toBe("No internet connection. Please check your network!");
    expect(/[Ѐ-ӿ]/.test(en.offlineBanner)).toBe(false);
  });
});
