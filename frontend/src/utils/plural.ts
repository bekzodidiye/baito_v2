export type Lang = 'uz' | 'ru' | 'en';

/**
 * Which form of a noun goes with a number.
 *
 * Interpolating a count straight into a label — `${n} Работник` — is right in
 * Uzbek and wrong in the other two. Russian wants three forms and picks by the
 * last digit, with the teens as an exception: 1 работник, 2 работника,
 * 5 работников, but 11 работников and 21 работник. English wants two.
 *
 * Callers pass the forms in that order: [one, few, many]. English uses the
 * first two, Uzbek only the first — a noun after a numeral does not inflect.
 */
export const pluralIndex = (n: number, language: Lang): number => {
  const abs = Math.abs(Math.trunc(n));
  if (language === 'ru') {
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return 0;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
    return 2;
  }
  if (language === 'en') return abs === 1 ? 0 : 1;
  return 0;
};

/** The form alone, without the number. */
export const pluralOf = (
  n: number,
  forms: readonly string[],
  language: Lang,
): string => forms[pluralIndex(n, language)] ?? forms[0];

/** Returns formatted count with properly inflected plural noun.
 * @example counted(1, ['worker', 'workers'], 'en') => "1 worker"
 * @example counted(5, ['работник', 'работника', 'работников'], 'ru') => "5 работников"
 * @example counted(5, ['ishchi'], 'uz') => "5 ishchi"
 */
export const counted = (
  n: number,
  forms: readonly string[],
  language: Lang,
): string => `${n} ${pluralOf(n, forms, language)}`;
