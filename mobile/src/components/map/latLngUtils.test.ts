import { describe, it, expect } from 'vitest';
import { getLatLng, isInsideUzbekistan } from './latLngUtils';
import { Job } from '../../types';

describe('mobile latLngUtils - Uzbekistan coordinates validation', () => {
  it('correctly parses backend coordinateX as latitude and coordinateY as longitude', () => {
    const jobWithBackendCoords = {
      id: 'job-tashkent-test',
      title: 'Toshkent Kuryer',
      location: 'Toshkent, Chilonzor',
      coordinateX: 41.2858, // Latitude
      coordinateY: 69.2035, // Longitude
    } as unknown as Job;

    const coords = getLatLng(jobWithBackendCoords);
    expect(coords.lat).toBe(41.2858);
    expect(coords.lng).toBe(69.2035);
    expect(isInsideUzbekistan(coords.lat, coords.lng)).toBe(true);
  });

  it('correctly identifies coordinates inside Uzbekistan', () => {
    // Tashkent
    expect(isInsideUzbekistan(41.2995, 69.2401)).toBe(true);
    // Samarkand
    expect(isInsideUzbekistan(39.6548, 66.9758)).toBe(true);
    // Nukus
    expect(isInsideUzbekistan(42.4611, 59.6166)).toBe(true);
    // Termez
    expect(isInsideUzbekistan(37.2242, 67.2783)).toBe(true);
  });

  it('rejects coordinates outside Uzbekistan and falls back to text location/region', () => {
    // Coordinate in Moscow (55.75, 37.61)
    expect(isInsideUzbekistan(55.75, 37.61)).toBe(false);

    const jobWithForeignCoords = {
      id: 'job-foreign-coords',
      title: 'Xorazm Ishchi',
      location: 'Xorazm, Urganch',
      coordinateX: 55.75,
      coordinateY: 37.61,
      coordinates: { x: 50, y: 50 },
    } as unknown as Job;

    const coords = getLatLng(jobWithForeignCoords);
    expect(isInsideUzbekistan(coords.lat, coords.lng)).toBe(true);
    // Should fallback to Xorazm center (~41.55, ~60.63)
    expect(coords.lat).toBeGreaterThan(40.5);
    expect(coords.lat).toBeLessThan(42.5);
    expect(coords.lng).toBeGreaterThan(59.5);
    expect(coords.lng).toBeLessThan(62.0);
  });

  it('immediately returns updated coordinates when coordinateX or coordinateY change on the same job/cluster id', () => {
    const clusterId = 'cluster_103_173';
    const clusterInitial = {
      id: clusterId,
      isCluster: true,
      count: 10,
      coordinateX: 41.3111,
      coordinateY: 69.2406,
    } as unknown as Job;

    const firstCoords = getLatLng(clusterInitial);
    expect(firstCoords.lat).toBe(41.3111);
    expect(firstCoords.lng).toBe(69.2406);

    const clusterUpdated = {
      id: clusterId,
      isCluster: true,
      count: 15,
      coordinateX: 41.3255,
      coordinateY: 69.2555,
    } as unknown as Job;

    const secondCoords = getLatLng(clusterUpdated);
    expect(secondCoords.lat).toBe(41.3255);
    expect(secondCoords.lng).toBe(69.2555);
  });
});
