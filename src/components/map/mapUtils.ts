import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { REGION_INFOS } from '../../data/regionInfos';

// Calculate the centroid/center of a GeoJSON geometry (Polygon or MultiPolygon)
export const getFeatureCenter = (geometry: any): { lat: number; lng: number } => {
  if (!geometry || !geometry.coordinates) return { lat: 41.3, lng: 69.2 };

  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  const processRing = (ring: any[]) => {
    ring.forEach(coord => {
      if (Array.isArray(coord) && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
        sumLng += coord[0];
        sumLat += coord[1];
        count++;
      }
    });
  };

  const processPolygon = (polygon: any[]) => {
    polygon.forEach(ring => {
      if (Array.isArray(ring)) {
        processRing(ring);
      }
    });
  };

  if (geometry.type === 'Polygon') {
    processPolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any) => {
      if (Array.isArray(polygon)) {
        processPolygon(polygon);
      }
    });
  } else if (geometry.type === 'Point') {
    return { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
  }

  if (count > 0) {
    return { lat: sumLat / count, lng: sumLng / count };
  }
  return { lat: 41.3, lng: 69.2 };
};

// Calculate the geographic bounding box of a GeoJSON geometry (Polygon or MultiPolygon)
export const getFeatureBounds = (geometry: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } => {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let hasCoords = false;

  const processRing = (ring: any[]) => {
    ring.forEach(coord => {
      if (Array.isArray(coord) && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
        const lng = coord[0];
        const lat = coord[1];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        hasCoords = true;
      }
    });
  };

  const processPolygon = (polygon: any[]) => {
    polygon.forEach(ring => {
      if (Array.isArray(ring)) {
        processRing(ring);
      }
    });
  };

  if (geometry.type === 'Polygon') {
    processPolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any) => {
      if (Array.isArray(polygon)) {
        processPolygon(polygon);
      }
    });
  } else if (geometry.type === 'Point') {
    minLng = maxLng = geometry.coordinates[0];
    minLat = maxLat = geometry.coordinates[1];
    hasCoords = true;
  }

  if (hasCoords) {
    return { minLat, maxLat, minLng, maxLng };
  }
  return { minLat: 41.2, maxLat: 41.4, minLng: 69.1, maxLng: 69.3 }; // Default
};

// Cache collections to eliminate expensive loop executions
const latLngCache = new Map<string, { lat: number; lng: number }>();
const districtMatchCache = new Map<string, boolean>();

// Map custom percentages (0-100) to real coordinates in Uzbekistan
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

  // 1. Try to find the district in districtsGeoJson and scatter naturally within its bounding box
  if (districtsGeoJson && districtsGeoJson.features) {
    const locationStr = job.rawLocation || job.location;
    const parts = locationStr.split(',');
    const districtPart = parts.length > 1 ? parts[1].trim() : locationStr.trim();

    const matchedDistrict = districtsGeoJson.features.find((f: any) =>
      f.properties && areDistrictNamesEqual(districtPart, f.properties.shapeName || "")
    );

    if (matchedDistrict && matchedDistrict.geometry) {
      const bounds = getFeatureBounds(matchedDistrict.geometry);
      
      // Pad the bounds by 15% to ensure the markers reside comfortably inside the polygon
      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;
      const paddingLat = latRange * 0.15;
      const paddingLng = lngRange * 0.15;

      const safeMinLat = bounds.minLat + paddingLat;
      const safeMaxLat = bounds.maxLat - paddingLat;
      const safeMinLng = bounds.minLng + paddingLng;
      const safeMaxLng = bounds.maxLng - paddingLng;

      // Map the stable seeded x/y percentages inside the padded bounding box
      const lng = safeMinLng + (x / 100) * (safeMaxLng - safeMinLng);
      const lat = safeMinLat + ((100 - y) / 100) * (safeMaxLat - safeMinLat);
      return { lat, lng };
    }
  }

  // 2. Fallback: Try to find matching region center
  const locStrFallback = job.rawLocation || job.location;
  const parts2 = locStrFallback.split(',');
  const regionPart = parts2[0].trim();
  const matchedRegion = UZBEKISTAN_REGIONS.find(r =>
    regionPart.toLowerCase().includes(r.id.toLowerCase()) ||
    r.id.toLowerCase().includes(regionPart.toLowerCase())
  );

  if (matchedRegion) {
    const center = matchedRegion.center; // [lat, lng]
    const offsetLng = ((x - 50) / 100) * 0.35; // ~30 km scatter
    const offsetLat = ((50 - y) / 100) * 0.25;
    return { lat: center[0] + offsetLat, lng: center[1] + offsetLng };
  }

  // 3. Absolute Fallback: Tashkent bounding box
  const lng = 69.15 + (x / 100) * (69.35 - 69.15);
  const lat = 41.38 - (y / 100) * (41.38 - 41.22);
  return { lat, lng };
};

export const getDistrictColor = (name: string): string => {
  const clean = name.toLowerCase().replace(/['`’‘-]/g, '').trim();
  if (clean.includes('peshku')) return '#b91c1c'; // Red/burgundy
  if (clean.includes('romitan')) return '#15803d'; // Green
  if (clean.includes('shofirkon')) return '#1d4ed8'; // Blue
  if (clean.includes('gijduvon') || clean.includes('g\'ijduvon')) return '#c2410c'; // Orange
  if (clean.includes('jondor')) return '#0f766e'; // Light teal
  if (clean.includes('qorakol') || clean.includes('qorako\'l')) return '#7e22ce'; // Purple
  if (clean.includes('olot')) return '#991b1b'; // Darker red/terracotta
  if (clean.includes('qorovulbozor')) return '#0369a1'; // Blue/cyan
  if (clean.includes('vobkent')) return '#047857'; // Sage/emerald green
  if (clean.includes('kogon')) return '#be185d'; // Light magenta/pink
  if (clean.includes('buxoro') || clean.includes('bukhara')) return '#4338ca'; // Indigo
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#d946ef', '#ec4899', '#14b8a6', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const getRegionStats = (regionId: string) => {
  const cleanId = regionId.toLowerCase();
  if (cleanId.includes('buxoro') || cleanId.includes('buxara')) {
    return {
      total: 133,
      checked: 85,
      completed: 55,
      percent: 41
    };
  }
  if (cleanId.includes('toshkent') && !cleanId.includes('shahr')) {
    return {
      total: 203,
      checked: 130,
      completed: 83,
      percent: 41
    };
  }
  let total = 120;
  if (cleanId.includes('samarqand')) total = 185;
  else if (cleanId.includes('fargona')) total = 145;
  else if (cleanId.includes('andijon')) total = 110;
  else if (cleanId.includes('namangan')) total = 115;
  else if (cleanId.includes('qashqadaryo')) total = 135;
  else if (cleanId.includes('surxondaryo')) total = 95;
  else if (cleanId.includes('jizzax')) total = 75;
  else if (cleanId.includes('sirdaryo')) total = 50;
  else if (cleanId.includes('navoiy')) total = 65;
  else if (cleanId.includes('xorazm')) total = 85;
  else if (cleanId.includes('qoraqalpogiston')) total = 105;

  const completed = Math.round(total * 0.41);
  const checked = Math.round(total * 0.64);
  return {
    total,
    checked,
    completed,
    percent: 41
  };
};

export const areDistrictNamesEqual = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;

  const key = `${name1}::${name2}`;
  if (districtMatchCache.has(key)) {
    return districtMatchCache.get(key)!;
  }

  const revKey = `${name2}::${name1}`;
  if (districtMatchCache.has(revKey)) {
    return districtMatchCache.get(revKey)!;
  }

  const result = calculateAreDistrictNamesEqual(name1, name2);
  if (districtMatchCache.size < 2000) {
    districtMatchCache.set(key, result);
  }
  return result;
};

const calculateAreDistrictNamesEqual = (name1: string, name2: string): boolean => {
  const lower1 = name1.toLowerCase();
  const lower2 = name2.toLowerCase();
  
  const isRegion1 = lower1.includes('viloyati') || lower1.includes('respublikasi');
  const isRegion2 = lower2.includes('viloyati') || lower2.includes('respublikasi');
  
  const isCity1 = lower1.includes('shahri') || lower1.includes('city');
  const isCity2 = lower2.includes('shahri') || lower2.includes('city');
  
  const isDistrict1 = lower1.includes('tumani') || lower1.includes('district');
  const isDistrict2 = lower2.includes('tumani') || lower2.includes('district');

  // A city/district and a region (viloyati) should not be equal
  if ((isRegion1 && (isCity2 || isDistrict2)) || (isRegion2 && (isCity1 || isDistrict1))) {
    return false;
  }
  
  // A city (shahri) and a district (tumani) with similar base names should not be equal
  if ((isCity1 && isDistrict2) || (isDistrict1 && isCity2)) {
    return false;
  }

  const cleanNormalize = (s: string) => {
    return s.toLowerCase()
      .replace(/tumani/g, '')
      .replace(/shahri/g, '')
      .replace(/city/g, '')
      .replace(/region/g, '')
      .replace(/viloyati/g, '')
      .replace(/rayon/g, '')
      .replace(/rayonli/g, '')
      .replace(/tumanli/g, '')
      .replace(/[\d\s']/g, '') // remove numbers, spaces, quotes
      .replace(/['’'`‘\s-]/g, '')
      .trim();
  };

  // 1. Try parallel matching using REGION_INFOS translations (extremely robust)
  let dIndex1 = -1;
  let rInfo1: any = null;
  
  for (const r of REGION_INFOS) {
    const idxUz = r.districtsUz.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxUz !== -1) { dIndex1 = idxUz; rInfo1 = r; break; }

    const idxRu = r.districtsRu.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxRu !== -1) { dIndex1 = idxRu; rInfo1 = r; break; }

    const idxEn = r.districtsEn.findIndex(d => cleanNormalize(d) === cleanNormalize(name1) || cleanNormalize(name1).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name1)));
    if (idxEn !== -1) { dIndex1 = idxEn; rInfo1 = r; break; }
  }

  if (rInfo1 && dIndex1 !== -1) {
    const uzName = rInfo1.districtsUz[dIndex1];
    const ruName = rInfo1.districtsRu[dIndex1];
    const enName = rInfo1.districtsEn[dIndex1];

    const n2 = cleanNormalize(name2);
    if (
      n2 === cleanNormalize(uzName) ||
      n2 === cleanNormalize(ruName) ||
      n2 === cleanNormalize(enName) ||
      cleanNormalize(uzName).includes(n2) ||
      cleanNormalize(ruName).includes(n2) ||
      cleanNormalize(enName).includes(n2) ||
      n2.includes(cleanNormalize(uzName)) ||
      n2.includes(cleanNormalize(ruName)) ||
      n2.includes(cleanNormalize(enName))
    ) {
      return true;
    }
  }

  let dIndex2 = -1;
  let rInfo2: any = null;
  
  for (const r of REGION_INFOS) {
    const idxUz = r.districtsUz.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxUz !== -1) { dIndex2 = idxUz; rInfo2 = r; break; }

    const idxRu = r.districtsRu.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxRu !== -1) { dIndex2 = idxRu; rInfo2 = r; break; }

    const idxEn = r.districtsEn.findIndex(d => cleanNormalize(d) === cleanNormalize(name2) || cleanNormalize(name2).includes(cleanNormalize(d)) || cleanNormalize(d).includes(cleanNormalize(name2)));
    if (idxEn !== -1) { dIndex2 = idxEn; rInfo2 = r; break; }
  }

  if (rInfo2 && dIndex2 !== -1) {
    const uzName = rInfo2.districtsUz[dIndex2];
    const ruName = rInfo2.districtsRu[dIndex2];
    const enName = rInfo2.districtsEn[dIndex2];

    const n1 = cleanNormalize(name1);
    if (
      n1 === cleanNormalize(uzName) ||
      n1 === cleanNormalize(ruName) ||
      n1 === cleanNormalize(enName) ||
      cleanNormalize(uzName).includes(n1) ||
      cleanNormalize(ruName).includes(n1) ||
      cleanNormalize(enName).includes(n1) ||
      n1.includes(cleanNormalize(uzName)) ||
      n1.includes(cleanNormalize(ruName)) ||
      n1.includes(cleanNormalize(enName))
    ) {
      return true;
    }
  }

  // 2. Standard heuristic fallback
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/tumani/g, '')
      .replace(/shahri/g, '')
      .replace(/city/g, '')
      .replace(/region/g, '')
      .replace(/viloyati/g, '')
      .replace(/prov/g, '')
      .replace(/province/g, '')
      .replace(/['’'`‘\s-]/g, '') // remove quotes, spaces, hyphens
      .replace(/o'/g, 'o')
      .replace(/g'/g, 'g')
      .replace(/sh/g, 's')
      .replace(/ch/g, 'c')
      .replace(/kh/g, 'x')
      .replace(/x/g, 'h') // unify x and h
      .replace(/q/g, 'k') // unify q and k
      .replace(/o/g, 'a') // unify o and a for spelling variants like Yunusobod vs Yunusabad, Chilonzor vs Chilanzar
      .trim();
  };

  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

export const mapFeatureToRegionId = (adm1En: string): string => {
  const name = adm1En.toLowerCase();
  if (name.includes('karakalpakstan')) return "Qoraqalpog'iston";
  if (name.includes('khorezm')) return "Xorazm";
  if (name.includes('navoi')) return "Navoiy";
  if (name.includes('bukhara')) return "Buxoro";
  if (name.includes('samarkand')) return "Samarqand";
  if (name.includes('kashkadarya')) return "Qashqadaryo";
  if (name.includes('surkhandarya')) return "Surxondaryo";
  if (name.includes('jizzakh')) return "Jizzax";
  if (name.includes('syrdarya')) return "Sirdaryo";
  if (name.includes('tashkent')) return "Toshkent";
  if (name.includes('namangan')) return "Namangan";
  if (name.includes('fergana')) return "Farg'ona";
  if (name.includes('andijan')) return "Andijon";
  return "";
};

export const isRegionName = (locationName: string): boolean => {
  if (!locationName) return false;
  const lower = locationName.toLowerCase();
  
  // Only "Toshkent shahri" is a region. Other city names like "Samarqand shahri" are districts.
  if (lower.includes('shahri') && !lower.includes('toshkent')) {
    return false;
  }
  
  return UZBEKISTAN_REGIONS.some(r => {
    const rId = r.id.toLowerCase();
    const rName = r.name.toLowerCase();
    return lower === rId || 
           lower === rName || 
           lower === `${rId} viloyati` || 
           (rId === 'toshkent' && lower === 'toshkent shahri') ||
           lower === `${rId} respublikasi` ||
           lower.replace(/['’'`‘]/g, '') === rId.replace(/['’'`‘]/g, '') ||
           lower.replace(/['’'`‘]/g, '') === rName.replace(/['’'`‘]/g, '') ||
           lower.replace(/['’'`‘]/g, '') === `${rId.replace(/['’'`‘]/g, '')} viloyati`;
  });
};

// Offset values to correct the alignment of Uzbekistan GeoJSON boundaries (shifting them north/east)
export const LAT_OFFSET = 0;
export const LNG_OFFSET = 0;

export const shiftCoordinates = (coords: any, lngOffset: number, latOffset: number, type: string): any => {
  if (!coords) return coords;
  
  if (type === 'Point') {
    return [coords[0] + lngOffset, coords[1] + latOffset];
  }
  
  if (type === 'LineString' || type === 'MultiPoint') {
    return coords.map((c: any) => [c[0] + lngOffset, c[1] + latOffset]);
  }
  
  if (type === 'Polygon' || type === 'MultiLineString') {
    return coords.map((ring: any) => 
      ring.map((c: any) => [c[0] + lngOffset, c[1] + latOffset])
    );
  }
  
  if (type === 'MultiPolygon') {
    return coords.map((polygon: any) => 
      polygon.map((ring: any) => 
        ring.map((c: any) => [c[0] + lngOffset, c[1] + latOffset])
      )
    );
  }
  
  return coords;
};

export const shiftGeometry = (geometry: any, lngOffset: number, latOffset: number): any => {
  if (!geometry) return geometry;
  
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map((g: any) => shiftGeometry(g, lngOffset, latOffset))
    };
  }
  
  return {
    ...geometry,
    coordinates: shiftCoordinates(geometry.coordinates, lngOffset, latOffset, geometry.type)
  };
};

export const shiftGeoJson = (geojson: any, lngOffset: number = LNG_OFFSET, latOffset: number = LAT_OFFSET): any => {
  if (!geojson) return geojson;
  if (lngOffset === 0 && latOffset === 0) return geojson;
  
  if (geojson.type === 'FeatureCollection') {
    return {
      ...geojson,
      features: geojson.features.map((f: any) => ({
        ...f,
        geometry: shiftGeometry(f.geometry, lngOffset, latOffset)
      }))
    };
  }
  
  if (geojson.type === 'Feature') {
    return {
      ...geojson,
      geometry: shiftGeometry(geojson.geometry, lngOffset, latOffset)
    };
  }
  
  return shiftGeometry(geojson, lngOffset, latOffset);
};

// Haversine formula to calculate the distance between two coordinates in kilometers
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Standard ray-casting point-in-polygon algorithm
export const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Check if a point [lng, lat] falls inside a GeoJSON feature
export const isPointInFeature = (lng: number, lat: number, feature: any): boolean => {
  if (!feature || !feature.geometry) return false;
  const { type, coordinates } = feature.geometry;
  const point: [number, number] = [lng, lat];

  if (type === 'Polygon') {
    if (!coordinates || coordinates.length === 0) return false;
    return isPointInPolygon(point, coordinates[0]);
  } else if (type === 'MultiPolygon') {
    if (!coordinates) return false;
    for (const poly of coordinates) {
      if (poly && poly.length > 0) {
        if (isPointInPolygon(point, poly[0])) {
          return true;
        }
      }
    }
  }
  return false;
};

export const DISTRICT_MAP: Record<string, string> = {
  // Surxondaryo
  "Termez": "Termiz tumani",
  "Baysun": "Boysun tumani",
  "Muzrabad": "Muzrabot tumani",
  "Sherabad": "Sherobod tumani",
  "Angor": "Angor tumani",
  "Sariasiya": "Sariosiyo tumani",
  "Dzharkurgan": "Jarqo'rg'on tumani",
  "Termez city": "Termiz shahri",
  "Kizirik": "Qiziriq tumani",
  "Shurchi": "Sho'rchi tumani",
  "Kumkurgan": "Qumqo'rg'on tumani",
  "Uzun": "Uzun tumani",
  "Altinsay": "Oltinsoy tumani",
  "Denau": "Denov tumani",

  // Navoiy
  "Nurata": "Nurota tumani",
  "Navoi city": "Navoiy shahri",
  "Kiziltepa": "Qiziltepa tumani",
  "Karmana": "Karmana tumani",
  "Navbakhor": "Navbahor tumani",
  "Khatirchi": "Xatirchi tumani",
  "Uchkuduk": "Uchquduq tumani",
  "Kanimekh": "Konimex tumani",
  "Tamdi": "Tomdi tumani",
  "Zarafshan city": "Zarafshon shahri",

  // Buxoro
  "Jondor": "Jondor tumani",
  "Bukhara": "Buxoro tumani",
  "Alat": "Olot tumani",
  "Karakul": "Qorako'l tumani",
  "Karaulbazar": "Qoravulbozor tumani",
  "Shafirkan": "Shofirkon tumani",
  "Rаmitan": "Romitan tumani",
  "Peshku": "Peshku tumani",
  "Kagan": "Kogon tumani",
  "Kagan city": "Kogon tumani",
  "Bukhara city": "Buxoro shahri",
  "Gijduvan": "G'ijduvon tumani",
  "Vabkent": "Vobkent tumani",

  // Qashqadaryo
  "Kasbi": "Kasbi tumani",
  "Mirishkar": "Mirishkor tumani",
  "Nishan": "Nishon tumani",
  "Mubarek": "Muborak tumani",
  "Kitab": "Kitob tumani",
  "Kamashi": "Qamashi tumani",
  "Karshi": "Qarshi tumani",
  "Guzar": "G'uzor tumani",
  "Dehkanabad": "Dehqonobod tumani",
  "Kasan": "Koson tumani",
  "Karshi city": "Qarshi shahri",
  "Chirakchi": "Chiroqchi tumani",
  "Yakkabag": "Yakkabog' tumani",
  "Shakhrisabz": "Shahrisabz tumani",
  "Shakhrisabz city": "Shahrisabz shahri",

  // Samarqand
  "Nurabad": "Nurobod tumani",
  "Pakhtachi": "Paxtachi tumani",
  "Pastdargom": "Pastdarg'om tumani",
  "Ishtikhan": "Ishtixon tumani",
  "Narpay": "Narpay tumani",
  "Kattakurgan": "Kattaqo'rg'on tumani",
  "Kattakurgan city": "Kattaqo'rg'on tumani",
  "Koshrabad": "Qo'shrabot tumani",
  "Samarkand city": "Samarqand shahri",
  "Urgut": "Urgut tumani",
  "Samarkand": "Samarqand tumani",
  "Taylak": "Toyloq tumani",
  "Dzhambay": "Jomboy tumani",
  "Payarik": "Payariq tumani",
  "Akdarya": "Oqdaryo tumani",
  "Bulungur": "Bulung'ur tumani",

  // Jizzax
  "Farish": "Forish tumani",
  "Gallyaaral": "G'allaarol tumani",
  "Yangiabad": "Yangiobod tumani",
  "Dzhizak city": "Jizzax shahri",
  "Bakhmal": "Baxmal tumani",
  "Sharof Rashidov": "Sharof Rashidov tumani",
  "Zafarabad": "Zafarobod tumani",
  "Zarbdar": "Zarbdor tumani",
  "Zaаmin": "Zomin tumani",
  "Paxtakor": "Paxtakor tumani",
  "Dustlik": "Do'stlik tumani",
  "Mirzachul": "Mirzacho'l tumani",
  "Arnasay": "Arnasoy tumani",

  // Xorazm
  "Khiva": "Xiva tumani",
  "Shavat": "Shovot tumani",
  "Koshkupir": "Qo'shko'pir tumani",
  "Gurlen": "Gurlan tumani",
  "Khazarasp": "Xazorasp tumani",
  "Khanka": "Xonqa tumani",
  "Yangiarik": "Yangiariq tumani",
  "Bagat": "Bog'ot tumani",
  "Urgench": "Urganch tumani",
  "Yangibazar": "Yangibozor tumani",
  "Urgench city": "Urganch shahri",
  "Khiva city": "Xiva shahri",

  // Qoraqalpog'iston
  "Karauzyak": "Qorauzo'yak tumani",
  "Kungrad": "Qo'ng'irot tumani",
  "Amudarya": "Amudaryo tumani",
  "Chimbay": "Chimboy tumani",
  "Kanlikul": "Qonliko'l tumani",
  "Shumanay": "Shumanay tumani",
  "Khojeyli": "Xo'jayli tumani",
  "Kegeyli": "Kegeyli tumani",
  "Muynak": "Mo'ynoq tumani",
  "Nukus": "Nukus tumani",
  "Takhtakupir": "Taxtako'pir tumani",
  "Nukus city": "Nukus shahri",
  "Turtkul": "To'rtko'l tumani",
  "Ellikkala": "Ellikqal'a tumani",
  "Beruniy": "Beruniy tumani",

  // Farg'ona
  "Bagdad": "Bag'dod tumani",
  "Uzbekistan": "O'zbekiston tumani",
  "Besharik": "Beshariq tumani",
  "Sokh": "So'x tumani",
  "Fergana": "Farg'ona tumani",
  "Rishtan": "Rishton tumani",
  "Altiarik": "Oltiariq tumani",
  "Uchkuprik": "Uchkuprik tumani",
  "Kuvasay city": "Quvasoy shahri",
  "Fergana city": "Farg'ona shahri",
  "Kokand city": "Qo'qon shahri",
  "Furkat": "Furqat tumani",
  "Kushtepa": "Qoshtepa tumani",
  "Buvayda": "Buvayda tumani",
  "Dangara": "Dang'ara tumani",
  "Yazyavan": "Yozyovon tumani",
  "Kuva": "Quva tumani",
  "Tashlak": "Toshloq tumani",
  "Margilan city": "Marg'ilon shahri",

  // Sirdaryo
  "Sardoba": "Sardoba tumani",
  "Khavas": "Xovos tumani",
  "Mirzaabad": "Mirzaobod tumani",
  "Bayaut": "Boyovut tumani",
  "Shirin city": "Shirin shahri",
  "Yangiyer city": "Yangiyer shahri",
  "Gulistan city": "Guliston shahri",
  "Saykhunabad": "Sayxunobod tumani",
  "Gulistan": "Guliston tumani",
  "Akaltin": "Oqoltin tumani",
  "Sirdarya": "Sirdaryo tumani",

  // Toshkent
  "Bekabad": "Bekobod tumani",
  "Bekabad city": "Bekobod shahri",
  "Urtachirchik": "O'rtachirchiq tumani",
  "Kuyichirchik": "Quyi Chirchiq tumani",
  "Chinaz": "Chinoz tumani",
  "Akhangaran": "Ohangaron tumani",
  "Buka": "Bo'ka tumani",
  "Akkurgan": "Oqqorg'on tumani",
  "Pskent": "Piskent tumani",
  "Almalik city": "Olmaliq shahri",
  "Akhangaran city": "Ohangaron shahri",
  "Bektemir": "Bektemir tumani",
  "Sergeli": "Sergeli tumani",
  "Yangiyul": "Yangiyo'l tumani",
  "Yangiyul city": "Yangiyo'l shahri",
  "Zangiata": "Zangiota tumani",
  "Chilanzar": "Chilonzor tumani",
  "Uchtepa": "Uchtepa tumani",
  "Tashkent": "Toshkent tumani", // Under Toshkent region
  "Yakkasaray": "Yakkasaroy tumani",
  "Almazar": "Olmazor tumani",
  "Shaykhantokhur": "Shayxontohur tumani",
  "Yunusabad": "Yunusobod tumani",
  "Yukarichirchik": "Yuqorichirchiq tumani",
  "Parkent": "Parkent tumani",
  "Angren city": "Angren shahri",
  "Kibray": "Qibray tumani",
  "Yashnobod": "Yashnobod tumani",
  "Mirabad": "Mirobod tumani",
  "Mirzo Ulugbek": "Mirzo Ulug'bek tumani",
  "Bostanlik": "Bo'stonliq tumani",
  "Chirchik city": "Chirchiq shahri",
  "Nurafshon city": "Nurafshon shahri",

  // Namangan
  "Pap": "Pop tumani",
  "Mingbulak": "Mingbuloq tumani",
  "Narin": "Norin tumani",
  "Chust": "Chust tumani",
  "Namangan": "Namangan tumani",
  "Turakurgan": "To'raqo'rg'on tumani",
  "Yangikurgan": "Yangiqo'rg'on tumani",
  "Kasansay": "Kosonsoy tumani",
  "Namangan city": "Namangan shahri",
  "Uychi": "Uychi tumani",
  "Chartak": "Chortoq tumani",
  "Uchkurgan": "Uchqo'rg'on tumani",

  // Andijon
  "Andijan": "Andijon tumani",
  "Ulugnar": "Ulug'nor tumani",
  "Khadjaabad": "Xodjaobod tumani",
  "Markhamat": "Marhamat tumani",
  "Asaka": "Asaka tumani",
  "Shakhrixan": "Shahrixon tumani",
  "Boz": "Bo'z tumani",
  "Djalalkuduk": "Jalaquduq tumani",
  "Bulakbashi": "Buloqboshi tumani",
  "Kurgantepa": "Qo'rg'ontepa tumani",
  "Balikchi": "Baliqchi tumani",
  "Khanabad city": "Xonobod shahri",
  "Altinkul": "Oltinko'l tumani",
  "Andijan city": "Andijon shahri",
  "Izboskan": "Izboskan tumani",
  "Paxtaabad": "Paxtaobod tumani"
};

export const formatDistrictName = (name: string): string => {
  if (!name) return "";
  const trimmed = name.trim();
  
  // Check direct exact match
  if (DISTRICT_MAP[trimmed]) {
    return DISTRICT_MAP[trimmed];
  }
  
  // Try case-insensitive matching
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(DISTRICT_MAP)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }
  
  // Fallback cleanup if not found in dictionary
  let clean = trimmed;
  if (clean.toLowerCase().endsWith(' city')) {
    clean = clean.substring(0, clean.length - 5) + ' shahri';
  } else if (!clean.toLowerCase().includes('tumani') && !clean.toLowerCase().includes('shahri')) {
    clean = clean + ' tumani';
  }
  return clean;
};
