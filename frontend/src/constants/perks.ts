/** Tags: how they read, and how they are matched.
 *
 * A job's tags are no longer shown on its card anywhere — not to the employer,
 * not to a worker browsing, not on the landing page. They are still a job's
 * own data, and they still do two jobs: the posting form offers them, and the
 * worker's search filters on them. `tagLabel` is what puts a readable name on
 * a filter chip.
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

/** The tags the posting form offers, in the order it offers them. Exported so
 *  the job search can filter on tags that jobs are actually given — its
 *  "Ish grafigi" filter used to compare them against "To'liq bandlik" and two
 *  others, which nothing anywhere writes, so it never matched a single job. */
export const PRESET_TAGS = [
  '#Tajribali', '#Tezkor', '#AyniVaqtda', "#KunlikTo'lov",
  '#TushlikBilan', '#TransportBilan', '#StudentlarGacha', '#Shoshilinch',
] as const;

/** Normalised form of a tag, so "#TushlikBilan", "tushlikbilan" and
 *  "#TUSHLIKBILAN" are one thing.
 *  @example tagKey("#TushlikBilan") => "tushlikbilan"
 */
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

