import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { getFeatureBounds } from './geoUtils';
import { areDistrictNamesEqual } from './districtUtils';

const latLngCache = new Map<string, { lat: number; lng: number }>();

export const getLatLng = (job: Job, districtsGeoJson?: any) => {
  const cacheKey = `${job.id}_${districtsGeoJson ? '1' : '0'}`;
  if (latLngCache.has(cacheKey)) {
    return latLngCache.get(cacheKey)!;
  }

  const result = calculateLatLng(job, districtsGeoJson);
  if (latLngCache.size < 5000) {
    latLngCache.set(cacheKey, result);
  }
  return result;
};

const calculateLatLng = (job: Job, districtsGeoJson?: any) => {
  const x = job.coordinates ? job.coordinates.x : 50;
  const y = job.coordinates ? job.coordinates.y : 50;

  if (districtsGeoJson && districtsGeoJson.features) {
    const locationStr = job.rawLocation || job.location;
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
      return { lat, lng };
    }
  }

  const locStrFallback = job.rawLocation || job.location;
  const parts2 = locStrFallback.split(',');
  const regionPart = parts2[0].trim();
  const matchedRegion = UZBEKISTAN_REGIONS.find(r =>
    regionPart.toLowerCase().includes(r.id.toLowerCase()) ||
    r.id.toLowerCase().includes(regionPart.toLowerCase())
  );

  if (matchedRegion) {
    const center = matchedRegion.center;
    const offsetLng = ((x - 50) / 100) * 0.35; 
    const offsetLat = ((50 - y) / 100) * 0.25;
    return { lat: center[0] + offsetLat, lng: center[1] + offsetLng };
  }

  const lng = 69.15 + (x / 100) * (69.35 - 69.15);
  const lat = 41.38 - (y / 100) * (41.38 - 41.22);
  return { lat, lng };
};
