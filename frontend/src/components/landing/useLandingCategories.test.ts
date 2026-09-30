import { describe, it, expect } from 'vitest';
import { rateText, countText, categoryName, LandingCategory } from './useLandingCategories';

const cat = (over: Partial<LandingCategory> = {}): LandingCategory => ({
  slug: 'logistics', name: 'Ombor va Kuryerlik', icon: '📦',
  description: 'Ombor ishlari va kuryerlik.',
  activeJobsCount: 0, salaryFrom: null, salaryTo: null, ...over,
});

/** The landing block advertised "1,240+ e'lon" and "180,000 - 350,000 so'm/kun"
 *  for six categories that existed nowhere but in a constants file. Every
 *  number on the card is measured now, or it is not shown. */
describe('rateText — a wage range is read off real postings or not shown', () => {
  it('shows the span of what is actually posted', () => {
    expect(rateText(cat({ salaryFrom: 180000, salaryTo: 350000 })))
      .toBe("180 000 - 350 000 so'm/kun");
  });

  it('shows one figure when every posting pays the same', () => {
    expect(rateText(cat({ salaryFrom: 200000, salaryTo: 200000 })))
      .toBe("200 000 so'm/kun");
  });

  it('falls back to the category description rather than inventing a range', () => {
    expect(rateText(cat())).toBe('Ombor ishlari va kuryerlik.');
  });

  it('says nothing at all when there is neither a range nor a description', () => {
    expect(rateText(cat({ description: null }))).toBe('');
  });
});

describe('countText — an empty category says so', () => {
  it('counts what is open', () => {
    expect(countText(cat({ activeJobsCount: 12 }))).toBe("12 e'lon");
  });

  it('does not dress up zero', () => {
    expect(countText(cat({ activeJobsCount: 0 }))).toBe("e'lon yo'q");
  });
});


// --- the language the cards speak -------------------------------------------
//
// Found by walking the live site in Russian: the categories grid sat under a
// Russian heading with Uzbek names, Uzbek badges and "so'm/kun" on every card.
// The names come from the database, which holds one name per row and writes it
// in Uzbek; the slugs are the same fourteen the frontend already had translated.

describe('The category cards read in the visitor’s language', () => {
  const retail = (over: Partial<LandingCategory> = {}): LandingCategory => ({
    slug: 'retail', name: 'Chakana savdo va Supermarket',
    activeJobsCount: 0, salaryFrom: null, salaryTo: null, ...over,
  });

  it('translates a category the platform knows by its slug', () => {
    expect(categoryName(retail(), 'ru')).toBe('Розничная торговля');
    expect(categoryName(retail(), 'en')).toBe('Retail & Supermarket');
    expect(categoryName(retail(), 'uz')).toBe('Chakana savdo va Supermarket');
  });

  it('keeps the administrator’s own name for a category it does not know', () => {
    const custom = retail({ slug: 'drone-piloting', name: 'Dron uchirish' });
    expect(categoryName(custom, 'ru')).toBe('Dron uchirish');
  });

  it('counts postings in the right language', () => {
    expect(countText(retail({ activeJobsCount: 9 }), 'ru')).toBe('9 объявл.');
    expect(countText(retail({ activeJobsCount: 9 }), 'en')).toBe('9 postings');
    expect(countText(retail({ activeJobsCount: 1 }), 'en')).toBe('1 posting');
    expect(countText(retail({ activeJobsCount: 9 }), 'uz')).toBe("9 e'lon");
  });

  it('says there are none in the right language', () => {
    expect(countText(retail(), 'ru')).toBe('нет объявлений');
    expect(countText(retail(), 'en')).toBe('no postings');
    expect(countText(retail(), 'uz')).toBe("e'lon yo'q");
  });

  it('puts the currency and the day in the right language', () => {
    const paid = retail({ salaryFrom: 968, salaryTo: 200000 });
    expect(rateText(paid, 'ru')).toContain('сум/день');
    expect(rateText(paid, 'en')).toContain('UZS/day');
    expect(rateText(paid, 'uz')).toContain("so'm/kun");
  });

  it('leaves no Uzbek on a Russian card', () => {
    const paid = retail({ activeJobsCount: 9, salaryFrom: 968, salaryTo: 200000 });
    const shown = [categoryName(paid, 'ru'), countText(paid, 'ru'), rateText(paid, 'ru')].join(' ');
    expect(shown).not.toContain("so'm");
    expect(shown).not.toContain("e'lon");
  });
});
