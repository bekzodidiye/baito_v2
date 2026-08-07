import React, { useEffect } from 'react';
import L from 'leaflet';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { mapFeatureToRegionId } from './mapUtils';

interface UseRegionPolygonStyleUpdateProps {
  isMapReady: boolean;
  regionsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  filterLocation: string;
  districtsGeoJsonData: any;
  findDistrictFeature: (locationName: string) => any;
}

export const useRegionPolygonStyleUpdate = ({
  isMapReady,
  regionsGeoJsonLayerRef,
  filterLocation,
  districtsGeoJsonData,
  findDistrictFeature
}: UseRegionPolygonStyleUpdateProps) => {
  useEffect(() => {
     if (!regionsGeoJsonLayerRef.current) return;
     
     let activeRegionIdForDistrict: string | null = null;
     if (districtsGeoJsonData && filterLocation !== 'Barchasi') {
        const matchedDistrict = findDistrictFeature(filterLocation);
        if (matchedDistrict?.properties?.regionId) {
          activeRegionIdForDistrict = matchedDistrict.properties.regionId;
        }
     }
     
     regionsGeoJsonLayerRef.current.eachLayer((layer: any) => {
        const regionId = mapFeatureToRegionId(layer.feature?.properties?.ADM1_EN || "");
        const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
        if (!region) return;
        
        const isSelected = filterLocation.toLowerCase().includes(regionId.toLowerCase());
        const isActiveFilter = filterLocation !== 'Barchasi';
        const isDistrictOfThisRegion = activeRegionIdForDistrict === regionId;
        const isRegionActive = isSelected || isDistrictOfThisRegion;
        
        let fillOpacity = 0.25;
        let weight = 1.5;
        let opacity = 0.7;
        
        if (isActiveFilter) {
          if (isRegionActive) {
            fillOpacity = 0.35;
            weight = 2.2;
            opacity = 0.85;
          } else {
            fillOpacity = 0.12;
            weight = 1.0;
            opacity = 0.4;
          }
        }
        
        layer.setStyle({
          color: region.color,
          weight: weight,
          opacity: opacity,
          fillColor: region.color,
          fillOpacity: fillOpacity,
          fillRule: 'nonzero',
          fill: true,
        });
     });
     
  }, [isMapReady, filterLocation, districtsGeoJsonData]);
};
