import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'terms', setCurrentScreen: vi.fn() }),
}));

import { PrivacyScreen } from './PrivacyScreen';
import { ShartlarScreen } from './ShartlarScreen';
import { PRIVACY } from './PrivacyScreen.content';
import { TERMS } from './ShartlarScreen.content';

afterEach(() => { cleanup(); localStorage.clear(); });
beforeEach(() => { language.current = 'ru'; localStorage.clear(); });

const body = () => document.body.textContent ?? '';

/** This screen asks the reader to tick six boxes agreeing to a policy. It was
 *  written in Uzbek only, so a reader who had chosen Russian was shown a
 *  document they could not read and then asked to consent to it. */
describe('Privacy policy — the reader can read what they are agreeing to', () => {
  it('lists the sections in Russian', () => {
    render(<PrivacyScreen />);
    for (const sec of PRIVACY.ru.sections) {
      expect(screen.getByText(sec.title)).toBeTruthy();
    }
  });

  it('shows no Uzbek section headings to a Russian reader', () => {
    render(<PrivacyScreen />);
    for (const sec of PRIVACY.uz.sections) {
      expect(screen.queryByText(sec.title)).toBeNull();
    }
  });

  it('opens a section and shows its body in the same language', () => {
    render(<PrivacyScreen />);
    fireEvent.click(screen.getByText(PRIVACY.ru.sections[0].title));
    const firstPara = PRIVACY.ru.sections[0].blocks.find(b => b.kind === 'p');
    expect(firstPara && 'text' in firstPara ? body().includes(firstPara.text) : false).toBe(true);
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<PrivacyScreen />);
    expect(screen.getByText(PRIVACY.uz.sections[0].title)).toBeTruthy();
  });
});

/** The consent gate used to require exactly six ticks by a hardcoded number.
 *  With the statements coming from a table, a gate that counts to six rather
 *  than counting the statements would silently stop matching them. */
describe('The consent gate counts the statements it is gating', () => {
  it('offers the same number of statements in every language', () => {
    expect(PRIVACY.ru.consentChecks).toHaveLength(PRIVACY.uz.consentChecks.length);
    expect(PRIVACY.en.consentChecks).toHaveLength(PRIVACY.uz.consentChecks.length);
  });

  it('gives every language the same number of sections', () => {
    expect(PRIVACY.ru.sections).toHaveLength(PRIVACY.uz.sections.length);
    expect(PRIVACY.en.sections).toHaveLength(PRIVACY.uz.sections.length);
  });

  it('keeps each section’s blocks parallel across languages', () => {
    PRIVACY.uz.sections.forEach((sec, i) => {
      expect(PRIVACY.ru.sections[i].blocks.map(b => b.kind))
        .toEqual(sec.blocks.map(b => b.kind));
      expect(PRIVACY.en.sections[i].blocks.map(b => b.kind))
        .toEqual(sec.blocks.map(b => b.kind));
    });
  });

  it('repeats the same support address in all three', () => {
    const contactsOf = (lang: 'uz' | 'ru' | 'en') => {
      const last = PRIVACY[lang].sections.at(-1)!;
      const block = last.blocks.find(b => b.kind === 'contacts');
      return block && block.kind === 'contacts' ? block.items.map(i => i.value) : [];
    };
    expect(contactsOf('ru').slice(0, 2)).toEqual(contactsOf('uz').slice(0, 2));
    expect(contactsOf('en').slice(0, 2)).toEqual(contactsOf('uz').slice(0, 2));
  });

  it('leaves no Cyrillic in the English policy', () => {
    const text = JSON.stringify(PRIVACY.en);
    expect(/[Ѐ-ӿ]/.test(text)).toBe(false);
  });
});

describe('Terms of service — the same, for the shorter document', () => {
  it('reads in Russian to a Russian reader', () => {
    render(<ShartlarScreen />);
    for (const sec of TERMS.ru.sections) {
      expect(screen.getByText(sec.heading)).toBeTruthy();
    }
    expect(body()).not.toContain('Umumiy qoidalar');
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<ShartlarScreen />);
    expect(screen.getByText('1. Umumiy qoidalar')).toBeTruthy();
  });

  it('carries the same clauses in every language', () => {
    expect(TERMS.ru.sections).toHaveLength(TERMS.uz.sections.length);
    expect(TERMS.en.sections).toHaveLength(TERMS.uz.sections.length);
  });
});

describe('Privacy policy — locked consent state', () => {
  it('displays policy, 100% progress, and disabled checkboxes when consent was already given', () => {
    localStorage.setItem('baito_privacy_consent', 'true');
    language.current = 'uz';
    render(<PrivacyScreen />);

    // Shows 11 / 11 read count and banner
    expect(screen.getByText("Maxfiylik siyosatiga to'liq rozilik berilgan")).toBeTruthy();
    expect(screen.getByText("Barcha bo'limlar to'liq o'qilgan")).toBeTruthy();
    expect(screen.getByText("11 / 11")).toBeTruthy();

    // All section titles are visible and can be read
    for (const sec of PRIVACY.uz.sections) {
      expect(screen.getByText(sec.title)).toBeTruthy();
    }

    // Consent checkboxes are rendered, checked, and disabled
    const checkboxes = screen.getAllByRole('checkbox', { hidden: true }) as HTMLInputElement[];
    expect(checkboxes.length).toBe(PRIVACY.uz.consentChecks.length);
    checkboxes.forEach((cb) => {
      expect(cb.checked).toBe(true);
      expect(cb.disabled).toBe(true);
    });

    // Displays the locked confirmation message
    expect(screen.getByText("Rozilik to'liq berilgan (O'zgartirib bo'lmaydi)")).toBeTruthy();
  });
});

describe('Terms of service — parity, search and active status', () => {
  it('leaves no Cyrillic in the English terms', () => {
    const text = JSON.stringify(TERMS.en);
    expect(/[Ѐ-ӿ]/.test(text)).toBe(false);
  });

  it('displays the active accepted terms banner in Uzbek', () => {
    language.current = 'uz';
    render(<ShartlarScreen />);
    expect(screen.getByText("Foydalanish shartlari qabul qilingan va amalda")).toBeTruthy();
    expect(screen.getByText("Amalda • 2026-yil")).toBeTruthy();
  });

  it('filters terms clauses when typing in search input', () => {
    language.current = 'uz';
    render(<ShartlarScreen />);
    const searchInput = screen.getByPlaceholderText(/Shartlar bo'yicha qidirish/i);
    fireEvent.change(searchInput, { target: { value: 'Escrow' } });

    expect(screen.getByText(/5\. Xavfsiz to'lov \(Escrow\)/i)).toBeTruthy();
    expect(screen.queryByText(/2\. Ro'yxatdan o'tish/i)).toBeNull();
  });
});

