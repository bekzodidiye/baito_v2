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
