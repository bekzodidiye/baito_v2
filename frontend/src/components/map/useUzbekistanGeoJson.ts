import { useState, useEffect } from 'react';
import { shiftGeoJson, LNG_OFFSET, LAT_OFFSET, formatDistrictName } from './mapUtils';

// Imported for their URL rather than read from /public, so Vite gives each file
// a content-hashed name under /assets — which nginx already serves with
// `immutable, max-age=1y`. From /public they matched no asset rule, fell through
// to the SPA location, and were served `no-store`: 1.66 MB of boundary data
// re-fetched on every single page load. A hashed name also means changing the
// data changes the URL, so nothing can serve a stale copy.
import regionsUrl from '../../data/geo/uzbekistan_regions.json?url';
import districtsUrl from '../../data/geo/uzbekistan_districts.json?url';

export interface GeoJsonData {
  geoJsonData: any;
  districtsGeoJsonData: any;
}

// Global memory cache & prefetch promises to prevent load delays
let cachedRegionsData: any = null;
let cachedDistrictsData: any = null;

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

// Three hooks call useUzbekistanGeoJson — the map, the job search and the
// region selector — and they mount together on the jobs screen. The module
// cache above is only filled once a fetch *resolves*, so each of them used to
// start its own request and, more expensively, run its own JSON.parse over the
// same multi-megabyte payload. Holding the in-flight promise collapses that
// back to one fetch and one parse, however many callers there are.
let regionsInFlight: Promise<any> | null = null;
let districtsInFlight: Promise<any> | null = null;

const loadRegionsData = async () => {
  if (cachedRegionsData) return cachedRegionsData;
  if (regionsInFlight) return regionsInFlight;

  regionsInFlight = (async () => {
    try {
      const res = await fetch(regionsUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.features) {
          cachedRegionsData = shiftGeoJson(data, LNG_OFFSET, LAT_OFFSET);
          return cachedRegionsData;
        }
      }
    } catch (e) {
      console.error('fetch of the region boundaries failed', e);
    } finally {
      // Let a later mount retry after a failure; a success is already cached.
      regionsInFlight = null;
    }
    return null;
  })();

  return regionsInFlight;
};

const loadDistrictsData = async () => {
  if (cachedDistrictsData) return cachedDistrictsData;
  if (districtsInFlight) return districtsInFlight;

  districtsInFlight = (async () => {
    let rawData: any = null;
    try {
      const res = await fetch(districtsUrl);
      if (res.ok) {
        rawData = await res.json();
      }
    } catch (e) {
      console.error('fetch of the district boundaries failed', e);
    } finally {
      districtsInFlight = null;
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
  })();

  return districtsInFlight;
};

/** Run once the browser is not busy drawing, falling back where unsupported. */
const whenIdle = (fn: () => void) => {
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === 'function') ric(fn, { timeout: 2000 });
  else setTimeout(fn, 300);
};

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

    // The districts file is the larger of the two by far and nothing on the
    // first paint needs it — the opening view is the fourteen regions. Starting
    // it alongside the regions made the two compete for bandwidth and put its
    // parse on the critical path, so it waits for a quiet moment instead.
    if (!cachedDistrictsData) {
      whenIdle(() => {
        loadDistrictsData().then(data => {
          if (isMounted && data) setDistrictsGeoJsonData(data);
        });
      });
    }

    return () => { isMounted = false; };
  }, []);

  return { geoJsonData, districtsGeoJsonData };
};
