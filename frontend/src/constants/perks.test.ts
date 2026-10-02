import { describe, it, expect } from 'vitest';
import { tagKey, tagLabel, PRESET_TAGS } from './perks';

/** A job's tags are no longer shown on its card anywhere. They remain the
 *  job's own data, and the worker's search still filters on them — these are
 *  the pieces that matching and the filter chips run on. */
describe('tagKey / tagLabel — the pieces the search filter runs on', () => {
  it('normalises the hash and the casing away', () => {
    expect(tagKey('#TushlikBilan')).toBe('tushlikbilan');
    expect(tagKey('tushlikbilan')).toBe('tushlikbilan');
    expect(tagKey('  #TUSHLIKBILAN ')).toBe('tushlikbilan');
  });

  it('gives a preset tag its human label', () => {
    expect(tagLabel('#TushlikBilan', 'uz')).toBe('🍲 Tushlik');
    expect(tagLabel('#TushlikBilan', 'en')).toBe('🍲 Lunch');
  });

  it('falls back to the tag itself for one the employer typed', () => {
    expect(tagLabel('#Formabilan', 'uz')).toBe('Formabilan');
  });

  it('offers the same eight tags the posting form does', () => {
    // The filter is built from this list; if it drifts from the form, the
    // filter starts offering things no job can have again.
    expect(PRESET_TAGS).toContain('#TushlikBilan');
    expect(PRESET_TAGS).toContain("#KunlikTo'lov");
    expect(PRESET_TAGS).toHaveLength(8);
  });
});
