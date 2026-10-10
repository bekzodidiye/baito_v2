import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'help', setCurrentScreen: vi.fn() }),
}));

import { HelpScreen } from './HelpScreen';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

/** The help centre was written straight into the JSX in Uzbek, so a reader who
 *  had chosen Russian got a Russian sidebar and an Uzbek page beside it:
 *  "Центр помощи" above "BIZ BILAN BOG'LANISH", "Telefon orqali", "Qo'llanma".
 *  The screen already had `t` in scope; none of the copy went through it. */
describe('HelpScreen — the page answers in the language that was chosen', () => {
  const uzbekOnly = [
    "Biz bilan bog'lanish",
    'Telefon orqali',
    'Elektron pochta',
    'Jonli chat',
    'Operatorlar bilan suhbat',
    'Foydali manbalar',
    "Ko'p so'raladigan savollar",
    "Qo'llanma",
    "Xizmat ko'rsatish shartlari",
  ];

  it('says nothing in Uzbek to a Russian reader', () => {
    render(<HelpScreen />);
    for (const word of uzbekOnly) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('says it in Russian instead', () => {
    render(<HelpScreen />);
    expect(screen.getByText('Связаться с нами')).toBeTruthy();
    expect(screen.getByText('По телефону')).toBeTruthy();
    expect(screen.getByText('Разговор с оператором')).toBeTruthy();
    expect(screen.getByText('Полезные материалы')).toBeTruthy();
    expect(screen.getByText('Условия предоставления услуг')).toBeTruthy();
  });

  it('says nothing in Uzbek to an English reader either', () => {
    language.current = 'en';
    render(<HelpScreen />);
    for (const word of uzbekOnly) {
      expect(screen.queryByText(word)).toBeNull();
    }
    expect(screen.getByText('Frequently asked questions')).toBeTruthy();
  });

  it('still reads correctly in Uzbek', () => {
    language.current = 'uz';
    render(<HelpScreen />);
    expect(screen.getByText("Biz bilan bog'lanish")).toBeTruthy();
    expect(screen.getByText("Qo'llanma")).toBeTruthy();
  });

  // The contact details themselves are not copy and must survive translation.
  it('keeps the phone number and the support address in every language', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      cleanup();
      language.current = lang;
      render(<HelpScreen />);
      expect(screen.getByText('+998 90 123 45 67')).toBeTruthy();
      expect(screen.getByText('support@baito.uz')).toBeTruthy();
    }
  });
});
