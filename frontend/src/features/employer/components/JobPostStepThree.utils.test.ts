import { describe, it, expect } from 'vitest';
import { formatStructuredAddress } from './JobPostStepThree.utils';

describe('formatStructuredAddress', () => {
  it('includes valid POI names at the end', () => {
    const data = {
      name: "Ko'p tarmoqli bolalar shifoxonasi",
      address: {
        city: 'Samarqand shahri',
        neighbourhood: 'Aksaray',
        road: "Ibn Sino ko'chasi"
      }
    };
    expect(formatStructuredAddress(data)).toBe("Samarqand shahri, Ibn Sino ko'chasi, Ko'p tarmoqli bolalar shifoxonasi");
  });

  it('filters out OSM noise tags from POI names', () => {
    const data = {
      name: 'Viewpoint of old ruins',
      address: {
        city: 'Samarqand shahri',
        road: "Afrosiyob ko'chasi"
      }
    };
    expect(formatStructuredAddress(data)).toBe("Samarqand shahri, Afrosiyob ko'chasi");
  });

});
