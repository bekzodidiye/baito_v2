/** The worker's payout card.
 *
 *  The admin payouts screen has always had a column for it and always shown
 *  "—": `bankCardMask` was read in three places and written by none, because
 *  no screen ever asked for it. This is what a worker types and how it reads
 *  back.
 *
 *  Uzbekistan issues two domestic schemes, both sixteen digits: UzCard starts
 *  8600, Humo starts 9860. Nothing else is accepted, because nothing else can
 *  be paid to.
 */

export const UZCARD_PREFIX = '8600';
export const HUMO_PREFIX = '9860';

export type CardScheme = 'uzcard' | 'humo' | null;

/** Digits only, at most sixteen of them. */
export const cardDigits = (value: string): string =>
  (value ?? '').replace(/\D/g, '').slice(0, 16);

/** `8600123456789012` reads back as `8600 1234 5678 9012`. */
export const formatCard = (value: string): string =>
  cardDigits(value).replace(/(.{4})(?=.)/g, '$1 ');

export const schemeOf = (value: string): CardScheme => {
  const digits = cardDigits(value);
  if (digits.startsWith(UZCARD_PREFIX)) return 'uzcard';
  if (digits.startsWith(HUMO_PREFIX)) return 'humo';
  return null;
};

/** Which of the two, or null — the label a person sees beside the field. */
export const schemeName = (value: string): string | null => {
  const scheme = schemeOf(value);
  return scheme === 'uzcard' ? 'UzCard' : scheme === 'humo' ? 'Humo' : null;
};

/** What is wrong with it, or null when nothing is. An empty field is not an
 *  error: a worker who has not been paid yet has no reason to fill it in. */
export const cardProblem = (
  value: string,
  lang: 'uz' | 'ru' | 'en',
): string | null => {
  const digits = cardDigits(value);
  if (!digits) return null;

  if (digits.length < 16) {
    return lang === 'uz' ? 'Karta raqami 16 ta raqamdan iborat'
      : lang === 'ru' ? 'Номер карты состоит из 16 цифр'
      : 'A card number is 16 digits';
  }
  if (!schemeOf(digits)) {
    return lang === 'uz' ? "Faqat UzCard (8600) yoki Humo (9860) kartalari"
      : lang === 'ru' ? 'Только карты UzCard (8600) или Humo (9860)'
      : 'Only UzCard (8600) or Humo (9860) cards';
  }
  return null;
};

/** How the number reads where it is only being shown back, not edited.
 * @example "8600 **** **** 9012"
 */
export const maskCard = (value: string): string => {
  const digits = cardDigits(value);
  if (digits.length < 16) return formatCard(digits);
  return `${digits.slice(0, 4)} **** **** ${digits.slice(12)}`;
};
