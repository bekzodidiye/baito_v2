import { describe, it, expect, vi } from 'vitest';
import { isRegionName } from './regionUtils';
import { areDistrictNamesEqual } from './districtUtils';
import { useMapNavigation } from './useMapNavigation';
import { renderHook, act } from '@testing-library/react';

describe('District Selection & Map Navigation Fixes', () => {
  it('correctly distinguishes regions from cities and districts', () => {
    // Regions (Viloyatlar)
    expect(isRegionName('Samarqand')).toBe(true);
    expect(isRegionName('Samarqand viloyati')).toBe(true);
    expect(isRegionName('Buxoro')).toBe(true);
    expect(isRegionName('Buxoro viloyati')).toBe(true);
    expect(isRegionName('Andijon')).toBe(true);
    expect(isRegionName('Andijon viloyati')).toBe(true);
    expect(isRegionName('Toshkent')).toBe(true);
    expect(isRegionName('Toshkent viloyati')).toBe(true);
    expect(isRegionName('Toshkent shahri')).toBe(true);
    expect(isRegionName("Qoraqalpog'iston")).toBe(true);
    expect(isRegionName("Qoraqalpog'iston Respublikasi")).toBe(true);

    // Cities (Shaharlar) within regions MUST NOT be treated as regions
    expect(isRegionName('Samarqand shahri')).toBe(false);
    expect(isRegionName('Buxoro shahri')).toBe(false);
    expect(isRegionName('Andijon shahri')).toBe(false);
    expect(isRegionName('Namangan shahri')).toBe(false);
    expect(isRegionName('Navoiy shahri')).toBe(false);
    expect(isRegionName('Qarshi shahri')).toBe(false);
    expect(isRegionName('Termiz shahri')).toBe(false);
    expect(isRegionName('Guliston shahri')).toBe(false);
    expect(isRegionName('Olmaliq shahri')).toBe(false);
    expect(isRegionName('Chirchiq shahri')).toBe(false);

    // Districts (Tumanlar) MUST NOT be treated as regions
    expect(isRegionName('Samarqand tumani')).toBe(false);
    expect(isRegionName('Buxoro tumani')).toBe(false);
    expect(isRegionName('Sirdaryo tumani')).toBe(false);
    expect(isRegionName('Chilonzor tumani')).toBe(false);
    expect(isRegionName('Urgut tumani')).toBe(false);
    expect(isRegionName('Paxtachi tumani')).toBe(false);

    // Full addresses with commas MUST NOT be regions
    expect(isRegionName('Samarqand, Samarqand shahri')).toBe(false);
    expect(isRegionName('Buxoro, Buxoro shahri')).toBe(false);
    expect(isRegionName('Toshkent, Chilonzor tumani')).toBe(false);

    // Barchasi is not a region
    expect(isRegionName('Barchasi')).toBe(false);
  });

  it('correctly matches district equality without conflating regions with cities or neighboring districts', () => {
    // City vs district of the same name are NOT equal
    expect(areDistrictNamesEqual('Samarqand shahri', 'Samarqand tumani')).toBe(false);
    expect(areDistrictNamesEqual("Kattaqo'rg'on shahri", "Kattaqo'rg'on tumani")).toBe(false);
    expect(areDistrictNamesEqual('Buxoro shahri', 'Buxoro tumani')).toBe(false);

    // Region vs city are NOT equal
    expect(areDistrictNamesEqual('Samarqand', 'Samarqand shahri')).toBe(false);
    expect(areDistrictNamesEqual('Samarqand viloyati', 'Samarqand shahri')).toBe(false);
    expect(areDistrictNamesEqual('Buxoro viloyati', 'Buxoro shahri')).toBe(false);

    // Address strings match their district part
    expect(areDistrictNamesEqual('Samarqand, Samarqand shahri', 'Samarqand shahri')).toBe(true);
    expect(areDistrictNamesEqual('Samarqand, Urgut tumani', 'Urgut tumani')).toBe(true);

    // Different districts in the same region do NOT match
    expect(areDistrictNamesEqual('Samarqand, Urgut tumani', 'Samarqand shahri')).toBe(false);
    expect(areDistrictNamesEqual('Samarqand, Paxtachi tumani', 'Samarqand shahri')).toBe(false);
  });

  it('provides correct 3-level breadcrumbs when a city inside a region is selected', () => {
    const mockDistrictsGeoJson = {
      features: [
        {
          properties: {
            shapeName: 'Samarqand shahri',
            regionId: 'Samarqand'
          }
        },
        {
          properties: {
            shapeName: 'Samarqand tumani',
            regionId: 'Samarqand'
          }
        },
        {
          properties: {
            shapeName: 'Urgut tumani',
            regionId: 'Samarqand'
          }
        }
      ]
    };

    const setFilterLocation = vi.fn();
    const panToCoords = vi.fn();

    // 1. When a region is selected: 2 levels: O'zbekiston / Samarqand viloyati
    const { result: regionNav } = renderHook(() => useMapNavigation({
      filterLocation: 'Samarqand viloyati',
      setFilterLocation,
      districtsGeoJsonData: mockDistrictsGeoJson,
      panToCoords
    }));

    expect(regionNav.current.breadcrumbItems).toEqual(["O'zbekiston", "Samarqand viloyati"]);

    // 2. When Samarqand shahri is selected: 3 levels: O'zbekiston / Samarqand viloyati / Samarqand shahri
    const { result: cityNav } = renderHook(() => useMapNavigation({
      filterLocation: 'Samarqand shahri',
      setFilterLocation,
      districtsGeoJsonData: mockDistrictsGeoJson,
      panToCoords
    }));

    expect(cityNav.current.breadcrumbItems).toEqual([
      "O'zbekiston",
      "Samarqand viloyati",
      "Samarqand shahri"
    ]);

    // 3. Clicking breadcrumb back from city steps back to region
    act(() => {
      cityNav.current.handleBreadcrumbBack();
    });
    expect(setFilterLocation).toHaveBeenCalledWith('Samarqand viloyati');

    // 4. Clicking breadcrumb back from region steps back to Barchasi
    setFilterLocation.mockClear();
    act(() => {
      regionNav.current.handleBreadcrumbBack();
    });
    expect(setFilterLocation).toHaveBeenCalledWith('Barchasi');
  });
});
