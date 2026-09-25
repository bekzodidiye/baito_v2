import { describe, it, expect } from 'vitest';
import { rateText, countText, LandingCategory } from './useLandingCategories';

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

  it('says nothing at all when there is neither a range nor a description', () => {
    expect(rateText(cat({ description: null }))).toBe('');
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
