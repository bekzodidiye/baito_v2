import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { CATEGORIES_LIST } from '../../constants/categories';
import { CATEGORY_DESCRIPTIONS } from '../../constants/categoryDescriptions';
import { counted } from '../../utils/plural';

/** A category card on the landing page.
 *
 *  These used to be six entries written into LandingData — invented names,
 *  invented counts ("1,240+ e'lon") and invented wage ranges. They are the
 *  categories an administrator maintains now, with the counts and ranges read
 *  off the open postings.
 */
export interface LandingCategory {
  slug: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  activeJobsCount: number;
  salaryFrom?: number | null;
  salaryTo?: number | null;
}

// uz-UZ groups with a non-breaking space, not a comma, so replacing commas
// alone left U+00A0 in the string. Both are normalised to an ordinary space.
const money = (n: number) => n.toLocaleString('uz-UZ').replace(/[,\u00a0\u202f]/g, ' ');

/** "180 000 - 350 000 so'm/kun", or the category's own description when nothing
 *  is posted in it. Never an invented range: a number on this card is either
 *  measured or absent. */
export type Lang = 'uz' | 'ru' | 'en';

const PER_DAY: Record<Lang, string> = {
  uz: "so'm/kun", ru: 'сум/день', en: 'UZS/day',
};
// The badge said "9 объявл." — an abbreviation standing in for agreement the
// code was not doing. Russian wants объявление / объявления / объявлений by the
// last digit; Uzbek does not inflect after a numeral at all.
const POSTING_FORMS: Record<Lang, readonly string[]> = {
  uz: ["e'lon"],
  ru: ['объявление', 'объявления', 'объявлений'],
  en: ['posting', 'postings'],
};
const NO_POSTINGS: Record<Lang, string> = {
  uz: "e'lon yo'q", ru: 'нет объявлений', en: 'no postings',
};

/** The line under a category's name when nothing is posted in it.
 *
 *  Like the name, it comes from the database as one Uzbek string. Translated
 *  by slug, falling back to whatever an administrator wrote for a category the
 *  frontend does not ship.
 */
export const categoryDescription = (c: LandingCategory, language: Lang): string => {
  // Same rule as the name: the row's own text for an Uzbek reader, the shipped
  // translation for the other two, and the row's text when we ship none.
  if (language === 'uz') return c.description || CATEGORY_DESCRIPTIONS[c.slug]?.uz || '';
  return CATEGORY_DESCRIPTIONS[c.slug]?.[language] || c.description || '';
};

export const rateText = (c: LandingCategory, language: Lang = 'uz'): string => {
  if (c.salaryFrom == null) return categoryDescription(c, language);
  const unit = PER_DAY[language] ?? PER_DAY.uz;
  if (c.salaryTo == null || c.salaryTo === c.salaryFrom) {
    return `${money(c.salaryFrom)} ${unit}`;
  }
  return `${money(c.salaryFrom)} - ${money(c.salaryTo)} ${unit}`;
};

/** "12 e'lon", or "e'lon yo'q". The old card always said "1,240+". */
export const countText = (c: LandingCategory, language: Lang = 'uz'): string =>
  c.activeJobsCount > 0
    ? counted(c.activeJobsCount, POSTING_FORMS[language] ?? POSTING_FORMS.uz, language)
    : (NO_POSTINGS[language] ?? NO_POSTINGS.uz);

/** The name to show for a category the API returned.
 *
 *  Categories come from the database, where a row carries one name and it is
 *  written in Uzbek. The slugs are the same fourteen the frontend already has
 *  translated in CATEGORIES_LIST, so a known category is shown in the reader's
 *  language and anything an administrator has added since falls back to the
 *  name they gave it.
 */
export const categoryName = (c: LandingCategory, language: Lang): string => {
  // An Uzbek reader gets the row's own name. It is written in Uzbek, and an
  // administrator may have edited it — a shipped string must not overwrite
  // that. For the other two languages there is no translated column, so the
  // shipped name for that slug is the best available.
  if (language === 'uz') return c.name;
  const known = CATEGORIES_LIST.find(k => k.id === c.slug);
  if (!known) return c.name;
  return language === 'ru' ? known.labelRu : known.labelEn;
};

export const useLandingCategories = (language: string) => {
  const [categories, setCategories] = useState<LandingCategory[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient('/categories')
      .then((rows: LandingCategory[]) => {
        if (alive && Array.isArray(rows) && rows.length > 0) setCategories(rows);
      })
      // The landing page is the first thing a visitor sees; an empty grid is
      // worse than the old copy, so the built-in list stands in if the request
      // fails.
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // The same fourteen categories the platform actually has, translated. This
  // used to stand in with six from LandingData that existed nowhere else — so
  // when the API was unreachable the page advertised categories no job could
  // ever be filed under, which is the thing this whole change removed.
  //
  // No counts and no wage ranges: with no API there is nothing to have counted,
  // and a figure invented here would read exactly like a measured one.
  const fallback: LandingCategory[] = CATEGORIES_LIST.map(c => ({
    slug: c.id,
    name: language === 'ru' ? c.labelRu : language === 'en' ? c.labelEn : c.labelUz,
    icon: null,
    description: null,
    activeJobsCount: 0,
    salaryFrom: null,
    salaryTo: null,
  }));

  // Eight — two full rows of four on desktop. Six left a two-card row with a
  // gap beside it.
  return {
    categories: (categories ?? fallback).slice(0, 8),
    isFallback: categories === null,
  };
};
