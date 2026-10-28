import { useState, useEffect } from 'react';
import { shiftGeoJson, LNG_OFFSET, LAT_OFFSET, formatDistrictName } from './mapUtils';

export interface GeoJsonData {
  geoJsonData: any;
  districtsGeoJsonData: any;
}

// Global memory cache & in-flight promises to prevent redundant fetches and re-parsing
let cachedRegionsData: any = null;
let cachedDistrictsData: any = null;
let regionsInFlight: Promise<any> | null = null;
let districtsInFlight: Promise<any> | null = null;

export interface DistrictMeta {
  shapeName: string;
  regionId: string;
  parentRegion: string;
}

let cachedDistrictMetaList: DistrictMeta[] | null = null;

export const getDistrictMetaList = (districtsGeoJsonData: any): DistrictMeta[] => {
  if (cachedDistrictMetaList) return cachedDistrictMetaList;
  if (!districtsGeoJsonData || !districtsGeoJsonData.features) return [];

  // Import imports dynamically or standard matching helpers
  const map = new Map<string, DistrictMeta>();
  
  // Tashkent city district names list
  const TASHKENT_CITY = [
    "Yunusobod", "Chilonzor", "Mirzo Ulug'bek", "Yashnobod", "Mirobod", "Bektemir",
    "Shayxontohur", "Olmazor", "Uchtepa", "Yakkasaroy", "Sergeli", "Yangihayot"
  ];

  districtsGeoJsonData.features.forEach((f: any) => {
    const shapeName = f.properties?.shapeName || "";
    const regionId = f.properties?.regionId || "";
    if (!shapeName) return;

    if (!map.has(shapeName)) {
      let parentRegion = "";
      if (regionId === "Toshkent") {
        const isCity = TASHKENT_CITY.some(d => d.toLowerCase() === shapeName.toLowerCase());
        parentRegion = isCity ? "Toshkent shahri" : "Toshkent viloyati";
      } else {
        const regionNamesMap: Record<string, string> = {
          "Qoraqalpog'iston": "Qoraqalpog'iston Respublikasi",
          "Andijon": "Andijon viloyati",
          "Buxoro": "Buxoro viloyati",
          "Farg'ona": "Farg'ona viloyati",
          "Jizzax": "Jizzax viloyati",
          "Namangan": "Namangan viloyati",
          "Navoiy": "Navoiy viloyati",
          "Qashqadaryo": "Qashqadaryo viloyati",
          "Samarqand": "Samarqand viloyati",
          "Sirdaryo": "Sirdaryo viloyati",
          "Surxondaryo": "Surxondaryo viloyati",
          "Xorazm": "Xorazm viloyati",
        };
        parentRegion = regionNamesMap[regionId] || `${regionId} viloyati`;
      }

      map.set(shapeName, {
        shapeName,
        regionId,
        parentRegion
      });
    }
  });

  cachedDistrictMetaList = Array.from(map.values());
  return cachedDistrictMetaList;
};

export const loadRegionsData = async () => {
  if (cachedRegionsData) return cachedRegionsData;
  if (regionsInFlight) return regionsInFlight;

  let currentPromise: Promise<any>;
  currentPromise = Promise.resolve().then(async () => {
    try {
      const res = await fetch('/uzbekistan_regions_std.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.features) {
          cachedRegionsData = shiftGeoJson(data, LNG_OFFSET, LAT_OFFSET);
          return cachedRegionsData;
        }
      }
    } catch (e) {
      console.error("fetch /uzbekistan_regions_std.json failed", e);
    } finally {
      // Identity-checked cleanup: only clear if registry still points to this exact Promise
      if (regionsInFlight === currentPromise) {
        regionsInFlight = null;
      }
    }
    return null;
  });

  regionsInFlight = currentPromise;
  return regionsInFlight;
};

export const loadDistrictsData = async () => {
  if (cachedDistrictsData) return cachedDistrictsData;
  if (districtsInFlight) return districtsInFlight;

  let currentPromise: Promise<any>;
  currentPromise = Promise.resolve().then(async () => {
    try {
      let rawData: any = null;
      try {
        const res = await fetch('/uzbekistan_districts.json');
        if (res.ok) {
          rawData = await res.json();
        }
      } catch (e) {
        console.error("fetch /uzbekistan_districts.json failed", e);
      }

      if (rawData && rawData.features) {
        const shiftedData = shiftGeoJson(rawData, LNG_OFFSET, LAT_OFFSET);
        if (shiftedData && shiftedData.features) {
          shiftedData.features = shiftedData.features.map((f: any) => {
            if (f.properties && f.properties.shapeName) {
              return {
                ...f,
                properties: {
                  ...f.properties,
                  shapeName: formatDistrictName(f.properties.shapeName)
                }
              };
            }
            return f;
          });
        }
        cachedDistrictsData = shiftedData;
        return cachedDistrictsData;
      }
      return null;
    } finally {
      // Identity-checked cleanup: only clear if registry still points to this exact Promise
      if (districtsInFlight === currentPromise) {
        districtsInFlight = null;
      }
    }
  });

  districtsInFlight = currentPromise;
  return districtsInFlight;
};

export const _resetGeoJsonCacheForTesting = () => {
  cachedRegionsData = null;
  cachedDistrictsData = null;
  regionsInFlight = null;
  districtsInFlight = null;
  cachedDistrictMetaList = null;
};

export const _getInFlightForTesting = () => ({
  regionsInFlight,
  districtsInFlight,
});

export const useUzbekistanGeoJson = (): GeoJsonData => {
  const [geoJsonData, setGeoJsonData] = useState<any>(cachedRegionsData);
  const [districtsGeoJsonData, setDistrictsGeoJsonData] = useState<any>(cachedDistrictsData);

  useEffect(() => {
    let isMounted = true;

    if (!cachedRegionsData) {
      loadRegionsData().then(data => {
        if (isMounted && data) setGeoJsonData(data);
      });
    }

    if (!cachedDistrictsData) {
      loadDistrictsData().then(data => {
        if (isMounted && data) setDistrictsGeoJsonData(data);
      });
    }

    return () => { isMounted = false; };
  }, []);

  return { geoJsonData, districtsGeoJsonData };
};
