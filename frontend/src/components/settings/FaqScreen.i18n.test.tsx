import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'faq', setCurrentScreen: vi.fn() }),
}));

import { FaqScreen } from './FaqScreen';
import { FAQ_CONTENT } from './FaqScreen.content';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const body = () => document.body.textContent ?? '';

/** The five questions and the heading were written into the JSX in Uzbek, so
 *  a Russian reader got a Russian page frame around five Uzbek questions. */
describe('FAQ — the questions are in the reader’s language', () => {
  it('shows no Uzbek to a Russian reader', () => {
    render(<FaqScreen />);
    expect(body()).not.toMatch(/Baito nima|bepulmi|topshirsam|o'chira olamanmi/);
    expect(body()).toContain('Что такое Baito?');
  });

  it('shows no Uzbek to an English reader', () => {
    language.current = 'en';
    render(<FaqScreen />);
    expect(body()).not.toMatch(/Baito nima|bepulmi|topshirsam/);
    expect(body()).toContain('What is Baito?');
  });

  it('still answers an Uzbek reader in Uzbek', () => {
    language.current = 'uz';
    render(<FaqScreen />);
    expect(body()).toContain('Baito nima?');
  });
});

describe('FAQ content', () => {
  it('asks the same questions in every language', () => {
    const counts = Object.values(FAQ_CONTENT).map(c => c.entries.length);
    expect(new Set(counts).size).toBe(1);
  });

  it('answers every question it asks', () => {
    for (const [lang, content] of Object.entries(FAQ_CONTENT)) {
      expect(content.title, lang).toBeTruthy();
      for (const entry of content.entries) {
        expect(entry.q.trim(), lang).not.toBe('');
        expect(entry.a.trim(), lang).not.toBe('');
      }
    }
  });

  it('carries no Uzbek into the Russian or English copy', () => {
    // The apostrophe forms o' and g' do not occur in either language.
    const uzbek = /\b\w*[oOgG]['’]\w+/;
    for (const lang of ['ru', 'en'] as const) {
      const all = [FAQ_CONTENT[lang].title,
                   ...FAQ_CONTENT[lang].entries.flatMap(e => [e.q, e.a])].join(' ');
      expect(all, lang).not.toMatch(uzbek);
    }
  });
});

describe('FAQ interactivity — search and category filter', () => {
  it('filters questions by category', () => {
    language.current = 'uz';
    render(<FaqScreen />);
    const employerChip = screen.getAllByRole('button', { name: /Ish beruvchilarga/ })[0];
    fireEvent.click(employerChip);

    expect(screen.getByText("Kompaniya sifatida qanday yangi e'lon joylashtirish mumkin?")).toBeTruthy();
    expect(screen.queryByText("Baito nima?")).toBeNull();
  });

  it('filters questions by search query', () => {
    language.current = 'uz';
    render(<FaqScreen />);
    const searchInput = screen.getByPlaceholderText("Savollardan qidirish (masalan: to'lov, bepulmi, ariza, profil)...");
    fireEvent.change(searchInput, { target: { value: 'xavfsizligi' } });

    expect(screen.getByText("To'lovlar xavfsizligi qanday ta'minlanadi?")).toBeTruthy();
    expect(screen.queryByText("Baito nima?")).toBeNull();
  });
});

