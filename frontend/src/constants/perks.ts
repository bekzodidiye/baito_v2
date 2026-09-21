/** The badges a shift card shows: what this particular job offers.
 *
 * These used to be three strings hard-coded into the landing page, identical on
 * every card — a shift with no lunch still advertised one. They come from the
 * tags an employer picks when posting, which already name exactly these things:
 * the form's preset list has #KunlikTo'lov, #TushlikBilan and #TransportBilan
 * on it. Reading them here is what makes the posting form control the card,
 * without inventing a second field that means the same as tags.
 */

export interface PerkLabel {
  labelUz: string;
  labelRu: string;
  labelEn: string;
}

/** Tag -> how it reads on a card. Keyed without the leading '#' and lowercased,
 *  because a tag typed by hand arrives in whatever case the employer used. */
const PERK_BY_TAG: Record<string, PerkLabel> = {
  "kunlikto'lov": { labelUz: "⚡ Kunlik to'lov", labelRu: '⚡ Ежедневная оплата', labelEn: '⚡ Daily pay' },
  tushlikbilan: { labelUz: "🍲 Tushlik", labelRu: '🍲 Обед', labelEn: '🍲 Lunch' },
  transportbilan: { labelUz: '🚐 Transport', labelRu: '🚐 Транспорт', labelEn: '🚐 Transport' },
  tajribali: { labelUz: '🎓 Tajriba talab', labelRu: '🎓 Требуется опыт', labelEn: '🎓 Experience needed' },
  tezkor: { labelUz: '🚀 Tezkor', labelRu: '🚀 Срочно', labelEn: '🚀 Fast' },
  aynivaqtda: { labelUz: '🕐 Ayni vaqtda', labelRu: '🕐 Точно в срок', labelEn: '🕐 On time' },
  studentlargacha: { labelUz: '🎒 Studentlarga', labelRu: '🎒 Для студентов', labelEn: '🎒 For students' },
  shoshilinch: { labelUz: '🔥 Shoshilinch', labelRu: '🔥 Срочно', labelEn: '🔥 Urgent' },
};

/** True of every job on the platform, not something an employer opts into: the
 *  wage is held in escrow the moment someone is hired. It is a promise the
 *  platform makes, so it is not driven by tags. */
const GUARANTEE: PerkLabel = {
  labelUz: '🛡️ Baito Kafolati',
  labelRu: '🛡️ Гарантия Baito',
  labelEn: '🛡️ Baito Guarantee',
};

/** The tags the posting form offers, in the order it offers them. Exported so
 *  the job search can filter on tags that jobs are actually given — its
 *  "Ish grafigi" filter used to compare them against "To'liq bandlik" and two
 *  others, which nothing anywhere writes, so it never matched a single job. */
export const PRESET_TAGS = [
  '#Tajribali', '#Tezkor', '#AyniVaqtda', "#KunlikTo'lov",
  '#TushlikBilan', '#TransportBilan', '#StudentlarGacha', '#Shoshilinch',
] as const;

/** Normalised form of a tag, so "#TushlikBilan", "tushlikbilan" and
 *  "#TUSHLIKBILAN" are one thing. */
export const tagKey = (tag: string): string =>
  // Trim before stripping the hash, not after: a tag typed as " #Tushlik" does
  // not start with '#' until the space is gone, so the other order left the
  // hash on and the tag stopped matching itself.
  String(tag).trim().replace(/^#/, '').trim().toLowerCase();

/** The tag as a person wrote it, without the hash. Same trim-first order. */
const bareTag = (tag: string): string => String(tag).trim().replace(/^#/, '').trim();

/** How a tag reads to a person. Falls back to the tag itself for one an
 *  employer typed, which has no label of ours. */
export const tagLabel = (tag: string, language: string): string => {
  const known = PERK_BY_TAG[tagKey(tag)];
  return known ? pick(known, language) : bareTag(tag);
};

const pick = (p: PerkLabel, language: string) =>
  language === 'ru' ? p.labelRu : language === 'en' ? p.labelEn : p.labelUz;

/**
 * Badges for one job's card.
 *
 * At most two of the employer's own, then the platform guarantee — the card is
 * laid out for three. Slicing after adding the guarantee would drop it from any
 * job that picked three tags, and it is the one badge that is always true.
 */
export const perksForJob = (tags: unknown, language: string): string[] => {
  const list = Array.isArray(tags) ? tags : [];
  const own = list
    .map((raw) => {
      const known = PERK_BY_TAG[tagKey(String(raw))];
      // A tag the employer typed themselves still belongs on the card; it just
      // has no icon of ours to put in front of it.
      return known ? pick(known, language) : bareTag(String(raw));
    })
    .filter(Boolean)
    .slice(0, 2);

  return [...own, pick(GUARANTEE, language)];
};
