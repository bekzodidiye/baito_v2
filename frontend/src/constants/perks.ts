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
      const key = String(raw).replace(/^#/, '').trim().toLowerCase();
      const known = PERK_BY_TAG[key];
      // A tag the employer typed themselves still belongs on the card; it just
      // has no icon of ours to put in front of it.
      return known ? pick(known, language) : String(raw).replace(/^#/, '').trim();
    })
    .filter(Boolean)
    .slice(0, 2);

  return [...own, pick(GUARANTEE, language)];
};
