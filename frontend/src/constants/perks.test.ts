import { describe, it, expect } from 'vitest';
import { perksForJob } from './perks';

/** The landing card used to print the same three strings on every shift — a job
 *  with no lunch still advertised one. They come from the employer's tags now. */
describe('perksForJob — the card says what this job actually offers', () => {
  it('turns the posting form’s tags into badges', () => {
    expect(perksForJob(["#TushlikBilan", "#TransportBilan"], 'uz')).toEqual([
      '🍲 Tushlik',
      '🚐 Transport',
      '🛡️ Baito Kafolati',
    ]);
  });

  it('does not claim a perk the employer never picked', () => {
    const shown = perksForJob(["#Tajribali"], 'uz');
    expect(shown.join(' ')).not.toContain('Tushlik');
    expect(shown.join(' ')).not.toContain("Kunlik to'lov");
  });

  it('still carries the platform guarantee when there are no tags at all', () => {
    // True of every job — the wage is in escrow from the moment of hiring — so
    // it is not the employer's to opt out of.
    expect(perksForJob([], 'uz')).toEqual(['🛡️ Baito Kafolati']);
    expect(perksForJob(undefined, 'uz')).toEqual(['🛡️ Baito Kafolati']);
  });

  it('keeps the guarantee even when the employer picked three tags', () => {
    // Slicing after adding it would have dropped the one badge that is always
    // true from exactly the jobs that filled in the most.
    const shown = perksForJob(["#TushlikBilan", "#TransportBilan", "#KunlikTo'lov"], 'uz');
    expect(shown).toHaveLength(3);
    expect(shown[2]).toBe('🛡️ Baito Kafolati');
  });

  it('shows a tag the employer typed themselves, without an icon', () => {
    expect(perksForJob(['#Formabilan'], 'uz')).toEqual(['Formabilan', '🛡️ Baito Kafolati']);
  });

  it('matches a tag whatever case it was typed in', () => {
    expect(perksForJob(['tushlikbilan', '#TUSHLIKBILAN'], 'uz')).toEqual([
      '🍲 Tushlik', '🍲 Tushlik', '🛡️ Baito Kafolati',
    ]);
  });

  it('reads in the language the visitor is using', () => {
    expect(perksForJob(['#TushlikBilan'], 'ru')).toEqual(['🍲 Обед', '🛡️ Гарантия Baito']);
    expect(perksForJob(['#TushlikBilan'], 'en')).toEqual(['🍲 Lunch', '🛡️ Baito Guarantee']);
  });
});
