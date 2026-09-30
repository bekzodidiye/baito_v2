import { describe, it, expect } from 'vitest';
import { rateText, countText, categoryName, categoryDescription, LandingCategory } from './useLandingCategories';
import { CATEGORIES_LIST } from '../../constants/categories';
import { CATEGORY_DESCRIPTIONS } from '../../constants/categoryDescriptions';

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

  it('describes the category when there is no range, rather than inventing one', () => {
    // A category the platform ships has a description of its own, so a blank
    // row falls back to that. What must never appear is a figure: the point of
    // this block is that a number on the card is measured or absent.
    expect(rateText(cat({ description: null }))).not.toMatch(/\d/);
    expect(rateText(cat({ description: null }))).toBe(
      "Ombor ishlari, yuk tashish va kuryerlik xizmati.",
    );
  });

  it('says nothing for a category nobody has described', () => {
    expect(rateText(cat({ slug: 'drone-piloting', description: null }))).toBe('');
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

describe('The line under the name is translated too', () => {
  const withDesc = (over: Partial<LandingCategory> = {}): LandingCategory => ({
    slug: 'auto', name: 'Avtoservis va Haydovchilik',
    description: "Avtoservis, yuvish va haydovchilik xizmatlari.",
    activeJobsCount: 0, salaryFrom: null, salaryTo: null, ...over,
  });

  it('describes a known category in the reader’s language', () => {
    expect(categoryDescription(withDesc(), 'ru')).toBe('Автосервис, мойка и услуги водителя.');
    expect(categoryDescription(withDesc(), 'en')).toBe('Garages, car washes and driving jobs.');
  });

  it('keeps the seed’s own Uzbek wording', () => {
    expect(categoryDescription(withDesc(), 'uz'))
      .toBe("Avtoservis, yuvish va haydovchilik xizmatlari.");
  });

  it('falls back to what an administrator wrote for a category it does not ship', () => {
    const custom = withDesc({ slug: 'drone-piloting', description: 'Dron uchirish ishlari.' });
    expect(categoryDescription(custom, 'ru')).toBe('Dron uchirish ishlari.');
  });

  it('is what rateText shows when nothing is posted', () => {
    expect(rateText(withDesc(), 'ru')).toBe('Автосервис, мойка и услуги водителя.');
  });

  it('still shows the wage range when there is one', () => {
    expect(rateText(withDesc({ salaryFrom: 968, salaryTo: 200000 }), 'ru')).toContain('сум/день');
  });

  it('covers every category the platform ships', () => {
    for (const c of CATEGORIES_LIST) {
      expect(CATEGORY_DESCRIPTIONS[c.id], `missing description for ${c.id}`).toBeTruthy();
    }
  });

  it('leaves no Cyrillic in the English descriptions', () => {
    for (const d of Object.values(CATEGORY_DESCRIPTIONS)) {
      expect(/[Ѐ-ӿ]/.test(d.en)).toBe(false);
    }
  });
});
