import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'landing', setCurrentScreen: vi.fn() }),
}));

import { LandingFeatures } from './LandingFeatures';
import { LandingIncomeCalculator } from './LandingIncomeCalculator';
import { LANDING_TEXTS } from './LandingData';
import { FEATURES_TEXTS } from './LandingFeatures.content';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const body = () => document.body.textContent ?? '';

/** The landing page is the first thing anyone sees, and most of it was written
 *  into the JSX in Uzbek: the six feature cards, the income calculator, the
 *  hero, the footer. A Russian visitor got a Russian navbar over an Uzbek
 *  pitch. LANDING_TEXTS already existed and covered about a third of it. */
describe('Landing — the pitch is in the visitor’s language', () => {
  it('translates all six feature cards, not just the heading', () => {
    render(<LandingFeatures />);
    for (const card of FEATURES_TEXTS.ru.cards) {
      expect(body()).toContain(card.title);
    }
    for (const card of FEATURES_TEXTS.uz.cards) {
      expect(body()).not.toContain(card.title);
    }
  });

  it('keeps the six cards when the language changes, rather than dropping any', () => {
    for (const lang of ['uz', 'ru', 'en'] as const) {
      cleanup();
      language.current = lang;
      render(<LandingFeatures />);
      for (const card of FEATURES_TEXTS[lang].cards) {
        expect(body()).toContain(card.title);
      }
    }
  });

  it('translates the income calculator, labels and category chips alike', () => {
    render(<LandingIncomeCalculator onSelectRole={vi.fn()} />);
    expect(body()).toContain(LANDING_TEXTS.ru.calcCategoryLabel);
    expect(body()).toContain(LANDING_TEXTS.ru.calcMonthlyLabel);
    for (const name of LANDING_TEXTS.ru.calcCategories) {
      expect(body()).toContain(name);
    }
    expect(body()).not.toContain('Kuryerlik');
    expect(body()).not.toContain('Taxminiy Oylik Daromad');
  });

  it('says the currency in the visitor’s language, not always so‘m', () => {
    render(<LandingIncomeCalculator onSelectRole={vi.fn()} />);
    expect(body()).toContain('сум');
    expect(body()).not.toContain("so'm");
  });

  it('keeps the hour and day units in step with the language', () => {
    render(<LandingIncomeCalculator onSelectRole={vi.fn()} />);
    // The defaults the calculator opens on.
    expect(body()).toContain('ч / день');
    expect(body()).not.toContain('soat / kun');
  });

  it('still reads in Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<LandingIncomeCalculator onSelectRole={vi.fn()} />);
    expect(body()).toContain('Taxminiy Oylik Daromad');
    expect(body()).toContain("so'm");
  });
});

/** The table is what every section reads from, so a key present in one locale
 *  and missing in another is a silently Uzbek section. */
describe('LANDING_TEXTS — the three locales stay in step', () => {
  it('defines the same keys in all three', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(LANDING_TEXTS.ru)).toEqual(keys(LANDING_TEXTS.uz));
    expect(keys(LANDING_TEXTS.en)).toEqual(keys(LANDING_TEXTS.uz));
  });

  it('gives the feature cards the same shape in all three', () => {
    expect(FEATURES_TEXTS.ru.cards).toHaveLength(FEATURES_TEXTS.uz.cards.length);
    expect(FEATURES_TEXTS.en.cards).toHaveLength(FEATURES_TEXTS.uz.cards.length);
  });

  it('leaves no Cyrillic in the English table', () => {
    const cyrillic = Object.entries(LANDING_TEXTS.en)
      .filter(([, v]) => typeof v === 'string' && /[Ѐ-ӿ]/.test(v))
      .map(([k]) => k);
    expect(cyrillic).toEqual([]);
  });

  it('offers the calculator the same number of categories in each language', () => {
    expect(LANDING_TEXTS.ru.calcCategories).toHaveLength(LANDING_TEXTS.uz.calcCategories.length);
    expect(LANDING_TEXTS.en.calcCategories).toHaveLength(LANDING_TEXTS.uz.calcCategories.length);
  });
});
