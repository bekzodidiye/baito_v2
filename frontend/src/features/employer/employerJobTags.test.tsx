/** The badges on an employer's own posting.
 *
 *  The detail modal wrote two of them straight into the JSX, so every posting
 *  advertised `#Tezkor` and `#KunlikTo'lov` whatever the employer had actually
 *  picked — and in Uzbek to every reader. The card rendered the raw tags, so a
 *  Russian reader got `#KUNLIKTO'LOV`.
 *
 *  `constants/perks.ts` already turns a posting's own tags into a label per
 *  language. It was written to fix exactly this on the landing page and never
 *  reached the employer's side.
 */
import { describe, it, expect } from 'vitest';
import { perksForJob } from '../../constants/perks';

describe('the badges on a posting', () => {
  it('say what this posting offers, not what every posting offers', () => {
    const quiet = perksForJob(['#TushlikBilan'], 'uz');
    expect(quiet.some(p => /Tezkor/i.test(p))).toBe(false);
    expect(quiet.some(p => /Tushlik/i.test(p))).toBe(true);
  });

  it('read in the reader’s language', () => {
    const ru = perksForJob(["#KunlikTo'lov", '#Tezkor'], 'ru');
    expect(ru.join(' ')).toContain('Ежедневная оплата');
    expect(ru.join(' ')).toContain('Срочно');
    expect(ru.join(' ')).not.toMatch(/KunlikTo|Tezkor/i);

    const en = perksForJob(["#KunlikTo'lov", '#Tezkor'], 'en');
    expect(en.join(' ')).toContain('Daily pay');
    expect(en.join(' ')).not.toMatch(/KunlikTo/i);
  });

  it('keeps a tag the employer typed themselves', () => {
    const own = perksForJob(['#NochVahta'], 'ru');
    expect(own.join(' ')).toContain('NochVahta');
  });

  it('always carries the platform guarantee, in the reader’s language', () => {
    expect(perksForJob([], 'ru').join(' ')).toContain('Гарантия Baito');
    expect(perksForJob([], 'en').join(' ')).toContain('Baito Guarantee');
    expect(perksForJob([], 'uz').join(' ')).toContain('Baito Kafolati');
  });

  it('survives a posting with no tags at all', () => {
    for (const tags of [undefined, null, [], 'not an array']) {
      expect(() => perksForJob(tags, 'ru')).not.toThrow();
      expect(perksForJob(tags, 'ru').length).toBeGreaterThan(0);
    }
  });
});
