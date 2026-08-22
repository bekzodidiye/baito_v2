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
  return { minLat: 41.2, maxLat: 41.4, minLng: 69.1, maxLng: 69.3 };
};

export { LAT_OFFSET, LNG_OFFSET, shiftCoordinates, shiftGeometry, shiftGeoJson } from './geoShiftUtils';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
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
