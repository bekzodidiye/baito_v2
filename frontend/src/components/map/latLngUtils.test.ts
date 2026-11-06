import { describe, it, expect } from 'vitest';
import { getLatLng, isInsideUzbekistan } from './latLngUtils';
import { Job } from '../../types';

describe('latLngUtils - Uzbekistan coordinates validation', () => {
  it('correctly identifies coordinates inside Uzbekistan', () => {
    // Tashkent
    expect(isInsideUzbekistan(41.2995, 69.2401)).toBe(true);
    // Samarkand
    expect(isInsideUzbekistan(39.6548, 66.9758)).toBe(true);
    // Nukus
    expect(isInsideUzbekistan(42.4611, 59.6166)).toBe(true);
    // Termez
    expect(isInsideUzbekistan(37.2242, 67.2783)).toBe(true);
    // Zarafshon
    expect(isInsideUzbekistan(41.5739, 64.2008)).toBe(true);
  });

  it('rejects coordinates outside Uzbekistan (e.g. Iraq, Caspian Sea, Russia)', () => {
    // Baghdad, Iraq (33.3, 44.3)
    expect(isInsideUzbekistan(33.3, 44.3)).toBe(false);
    // Caspian Sea (40.0, 51.0)
    expect(isInsideUzbekistan(40.0, 51.0)).toBe(false);
    // Moscow, Russia (55.75, 37.61)
    expect(isInsideUzbekistan(55.75, 37.61)).toBe(false);
    // Legacy percentage coordinate (35, 45)
    expect(isInsideUzbekistan(35, 45)).toBe(false);
  });

  it('falls back to known city coordinates when coordinateX/Y are invalid percentages or outside Uzbekistan', () => {
    const jobWithLegacyCoords = {
      id: 'job-navoiy-zarafshon',
      title: 'Sanoat Ombori Ishchisi',
      location: 'Navoiy, Zarafshon',
      coordinateX: 35, // percentage legacy coordinate
      coordinateY: 45, // percentage legacy coordinate
      coordinates: { x: 50, y: 50 },
    } as unknown as Job;

    const coords = getLatLng(jobWithLegacyCoords);
    expect(isInsideUzbekistan(coords.lat, coords.lng)).toBe(true);
    // Zarafshon is around lat ~41.57, lng ~64.20
    expect(coords.lat).toBeGreaterThan(41.0);
    expect(coords.lat).toBeLessThan(42.0);
    expect(coords.lng).toBeGreaterThan(63.5);
    expect(coords.lng).toBeLessThan(65.0);
  });

  it('correctly maps various cities across Uzbekistan', () => {
    const citiesToTest = [
      { loc: 'Toshkent, Chilonzor', minLat: 41.0, maxLat: 41.5, minLng: 69.0, maxLng: 69.5 },
      { loc: 'Farg\'ona, Marg\'ilon', minLat: 40.0, maxLat: 41.0, minLng: 71.0, maxLng: 72.0 },
      { loc: 'Andijon, Shahrixon', minLat: 40.0, maxLat: 41.2, minLng: 71.5, maxLng: 72.5 },
      { loc: 'Namangan, Chortoq', minLat: 40.5, maxLat: 41.5, minLng: 71.3, maxLng: 72.3 },
      { loc: 'Urganch, Xiva', minLat: 41.0, maxLat: 42.0, minLng: 60.0, maxLng: 61.0 },
      { loc: 'Nukus, Xo\'jayli', minLat: 42.0, maxLat: 43.0, minLng: 59.0, maxLng: 60.5 },
    ];

    for (const item of citiesToTest) {
      const j = {
        id: `test-${item.loc}`,
        location: item.loc,
        coordinates: { x: 50, y: 50 },
      } as unknown as Job;

      const coords = getLatLng(j);
      expect(isInsideUzbekistan(coords.lat, coords.lng)).toBe(true);
      expect(coords.lat).toBeGreaterThanOrEqual(item.minLat);
      expect(coords.lat).toBeLessThanOrEqual(item.maxLat);
      expect(coords.lng).toBeGreaterThanOrEqual(item.minLng);
      expect(coords.lng).toBeLessThanOrEqual(item.maxLng);
    }
  });
});
