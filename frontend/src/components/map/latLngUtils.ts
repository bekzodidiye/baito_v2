import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { getFeatureBounds } from './geoUtils';
import { areDistrictNamesEqual } from './districtUtils';

const latLngCache = new Map<string, { lat: number; lng: number }>();

export const getLatLng = (job: Job, districtsGeoJson?: any) => {
  const anyJob = job as any;
  const coordX = anyJob.coordinateX ?? anyJob.latitude;
  const coordY = anyJob.coordinateY ?? anyJob.longitude;

  // When backend coordinates are present and valid, return them directly to avoid stale cache on updates
  if (
    typeof coordX === 'number' &&
    typeof coordY === 'number' &&
    coordX !== 0 &&
    coordY !== 0 &&
    isInsideUzbekistan(coordX, coordY)
  ) {
    return { lat: coordX, lng: coordY };
  }

  const cacheKey = `${job.id}_${job.rawLocation || job.location || ''}_${districtsGeoJson ? '1' : '0'}`;
  if (latLngCache.has(cacheKey)) {
    return latLngCache.get(cacheKey)!;
  }

  const result = calculateLatLng(job, districtsGeoJson);
  if (latLngCache.size < 5000) {
    latLngCache.set(cacheKey, result);
  }
  return result;
};

export const isInsideUzbekistan = (lat: number, lng: number): boolean => {
  return lat >= 37.0 && lat <= 45.8 && lng >= 55.9 && lng <= 73.5;
};

// Known coordinates for common cities/towns in Uzbekistan to prevent invalid mapping
const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  zarafshon: { lat: 41.5739, lng: 64.2008 },
  zarafshan: { lat: 41.5739, lng: 64.2008 },
  margilon: { lat: 40.4722, lng: 71.7167 },
  "marg'ilon": { lat: 40.4722, lng: 71.7167 },
  shahrixon: { lat: 40.7153, lng: 71.8667 },
  chortoq: { lat: 41.0667, lng: 71.8167 },
  xiva: { lat: 41.3783, lng: 60.3639 },
  urganch: { lat: 41.5500, lng: 60.6333 },
  "xo'jayli": { lat: 42.4000, lng: 59.4500 },
  xojayli: { lat: 42.4000, lng: 59.4500 },
  nukus: { lat: 42.4611, lng: 59.6166 },
  chilonzor: { lat: 41.2858, lng: 69.2035 },
  yakkasaroy: { lat: 41.2825, lng: 69.2558 },
  yunusobod: { lat: 41.3644, lng: 69.2882 },
  registon: { lat: 39.6548, lng: 66.9758 },
  samarqand: { lat: 39.6548, lng: 66.9758 },
  buxoro: { lat: 39.7747, lng: 64.4286 },
  navoiy: { lat: 40.1039, lng: 65.3688 },
  andijon: { lat: 40.7821, lng: 72.3442 },
  namangan: { lat: 40.9983, lng: 71.6726 },
  "farg'ona": { lat: 40.3864, lng: 71.7864 },
  fargona: { lat: 40.3864, lng: 71.7864 },
  termiz: { lat: 37.2242, lng: 67.2783 },
  qarshi: { lat: 38.8606, lng: 65.7891 },
  jizzax: { lat: 40.1158, lng: 67.8422 },
  guliston: { lat: 40.4897, lng: 68.7842 },
  toshkent: { lat: 41.2995, lng: 69.2401 },
  tashkent: { lat: 41.2995, lng: 69.2401 }
};

const findKnownCityCoords = (str: string) => {
  if (!str) return null;
  const clean = str.toLowerCase().replace(/['`ʻ’]/g, '');
  for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
    const cleanKey = key.replace(/['`ʻ’]/g, '');
    if (clean.includes(cleanKey)) {
      return coords;
    }
  }
  return null;
};

const calculateLatLng = (job: Job, districtsGeoJson?: any) => {
  const anyJob = job as any;
  if (
    typeof anyJob.coordinateX === 'number' &&
    typeof anyJob.coordinateY === 'number' &&
    anyJob.coordinateX !== 0 &&
    anyJob.coordinateY !== 0 &&
    isInsideUzbekistan(anyJob.coordinateX, anyJob.coordinateY)
  ) {
    return { lat: anyJob.coordinateX, lng: anyJob.coordinateY };
  }

  const x = job.coordinates ? job.coordinates.x : 50;
  const y = job.coordinates ? job.coordinates.y : 50;
  const locationStr = job.rawLocation || job.location || '';

  if (districtsGeoJson && districtsGeoJson.features) {
    const parts = locationStr.split(',');
    const districtPart = parts.length > 1 ? parts[1].trim() : locationStr.trim();

    const matchedDistrict = districtsGeoJson.features.find((f: any) =>
      f.properties && areDistrictNamesEqual(districtPart, f.properties.shapeName || "")
    );

    if (matchedDistrict && matchedDistrict.geometry) {
      const bounds = getFeatureBounds(matchedDistrict.geometry);
      
      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;
      const paddingLat = latRange * 0.15;
      const paddingLng = lngRange * 0.15;

      const safeMinLat = bounds.minLat + paddingLat;
      const safeMaxLat = bounds.maxLat - paddingLat;
      const safeMinLng = bounds.minLng + paddingLng;
      const safeMaxLng = bounds.maxLng - paddingLng;

      const lng = safeMinLng + (x / 100) * (safeMaxLng - safeMinLng);
      const lat = safeMinLat + ((100 - y) / 100) * (safeMaxLat - safeMinLat);
      if (isInsideUzbekistan(lat, lng)) {
        return { lat, lng };
      }
    }
  }

  // Check known cities and towns
  const knownCoords = findKnownCityCoords(locationStr);
  if (knownCoords) {
    // Add small subtle jitter based on job coordinates (0-100) to avoid exact overlapping
    const jitterLat = ((50 - y) / 100) * 0.04;
    const jitterLng = ((x - 50) / 100) * 0.04;
    return { lat: knownCoords.lat + jitterLat, lng: knownCoords.lng + jitterLng };
  }

  const parts2 = locationStr.split(',');
  const regionPart = parts2[0].trim();
  const matchedRegion = UZBEKISTAN_REGIONS.find(r =>
    regionPart.toLowerCase().includes(r.id.toLowerCase()) ||
    r.id.toLowerCase().includes(regionPart.toLowerCase())
  );

  if (matchedRegion) {
    const center = matchedRegion.center;
    const offsetLng = ((x - 50) / 100) * 0.35; 
    const offsetLat = ((50 - y) / 100) * 0.25;
    const lat = center[0] + offsetLat;
    const lng = center[1] + offsetLng;
    if (isInsideUzbekistan(lat, lng)) {
      return { lat, lng };
    }
    return { lat: center[0], lng: center[1] };
  }

  const lng = 69.15 + (x / 100) * (69.35 - 69.15);
  const lat = 41.38 - (y / 100) * (41.38 - 41.22);
  return { lat, lng };
};
