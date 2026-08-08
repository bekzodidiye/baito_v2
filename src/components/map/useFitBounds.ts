import React, { useEffect } from 'react';
import L from 'leaflet';
import { mapFeatureToRegionId, areDistrictNamesEqual } from './mapUtils';

interface UseFitBoundsProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  districtsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  filterLocation: string;
  lastFittedLocationRef: React.MutableRefObject<string>;
  geoJsonData: any;
  districtsGeoJsonData: any;
}

export const useFitBounds = ({
  isMapReady,
  mapInstanceRef,
  regionsGeoJsonLayerRef,
  districtsGeoJsonLayerRef,
  filterLocation,
  lastFittedLocationRef,
  geoJsonData,
  districtsGeoJsonData
}: UseFitBoundsProps) => {
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || filterLocation === 'Barchasi') return;
    
    if (lastFittedLocationRef.current !== filterLocation) {
      const fitTimer = setTimeout(() => {
        if (!mapInstanceRef.current) return;
        const currentMap = mapInstanceRef.current;
        let foundAndFitted = false;
        
        if (regionsGeoJsonLayerRef.current) {
          const layers = regionsGeoJsonLayerRef.current.getLayers();
          for (const layer of layers) {
            const feature = (layer as any).feature;
            const rawRegionId = feature?.properties?.ADM1_EN || "";
            const mappedRegionId = mapFeatureToRegionId(rawRegionId);
            
            const isMatch = filterLocation.toLowerCase().includes(mappedRegionId.toLowerCase()) || 
                            filterLocation.toLowerCase().includes(rawRegionId.toLowerCase()) ||
                            (feature?.properties?.ADM1_UZ && filterLocation.toLowerCase().includes(feature.properties.ADM1_UZ.toLowerCase()));
            
            if (mappedRegionId && isMatch) {
              if ((layer as any).getBounds) {
                currentMap.fitBounds((layer as any).getBounds(), {
                  paddingTopLeft: [15, 80],
                  paddingBottomRight: [15, 110],
                  maxZoom: 9.8,
                  animate: true,
                  duration: 1.0
                });
                lastFittedLocationRef.current = filterLocation;
                foundAndFitted = true;
              }
              break;
            }
          }
        }
        
        if (!foundAndFitted && districtsGeoJsonLayerRef.current) {
          const layers = districtsGeoJsonLayerRef.current.getLayers();
          for (const layer of layers) {
            const feature = (layer as any).feature;
            const tumanName = feature?.properties?.shapeName || "";
            if (areDistrictNamesEqual(filterLocation, tumanName)) {
              if ((layer as any).getBounds) {
                currentMap.fitBounds((layer as any).getBounds(), {
                  paddingTopLeft: [15, 80],
                  paddingBottomRight: [15, 110],
                  maxZoom: 12.0,
                  animate: true,
                  duration: 0.8
                });
                lastFittedLocationRef.current = filterLocation;
                foundAndFitted = true;
              }
              break;
            }
          }
        }
      }, 50);

      return () => clearTimeout(fitTimer);
    }
  }, [isMapReady, filterLocation, mapInstanceRef, lastFittedLocationRef, geoJsonData, districtsGeoJsonData, regionsGeoJsonLayerRef, districtsGeoJsonLayerRef]);
};
