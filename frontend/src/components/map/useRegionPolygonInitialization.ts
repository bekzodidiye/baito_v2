import React, { useEffect } from 'react';
import L from 'leaflet';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { mapFeatureToRegionId } from './mapUtils';

interface UseRegionPolygonInitializationProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  geoJsonData: any;
  regionsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  setFilterLocationRef: React.MutableRefObject<(loc: string) => void>;
  setIsPanelExpandedRef: React.MutableRefObject<(expanded: boolean) => void>;
  lastFittedLocationRef: React.MutableRefObject<string>;
  filterLocRef: React.MutableRefObject<string>;
  districtsGeoJsonData: any;
  findDistrictFeature: (locationName: string) => any;
}

export const useRegionPolygonInitialization = ({
  isMapReady,
  mapInstanceRef,
  regionsGroupRef,
  geoJsonData,
  regionsGeoJsonLayerRef,
  setFilterLocationRef,
  setIsPanelExpandedRef,
  lastFittedLocationRef,
  filterLocRef,
  districtsGeoJsonData,
  findDistrictFeature
}: UseRegionPolygonInitializationProps) => {
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = regionsGroupRef.current;
    if (!map || !group || !geoJsonData) return;
    
    if (!regionsGeoJsonLayerRef.current) {
      const geoJsonLayer = L.geoJSON(geoJsonData, {
        style: (feature) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          return {
            color: region ? region.color : "#94a3b8",
            weight: 1.5,
            opacity: 0.7,
            fillColor: region ? region.color : "#94a3b8",
            fillOpacity: 0.25,
            fillRule: 'nonzero',
            fill: true,
            className: region ? `region-polygon-${region.id}` : ''
          };
        },
        onEachFeature: (feature, layer) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          if (!region) return;
          
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setFilterLocationRef.current(region.id);
            setIsPanelExpandedRef.current(false);
            if ((layer as any).getBounds) {
              map.fitBounds((layer as any).getBounds(), {
                paddingTopLeft: [15, 80],
                paddingBottomRight: [15, 110],
                maxZoom: 9.8,
                animate: true,
                duration: 1.0
              });
              lastFittedLocationRef.current = region.id;
            }
          });
          
          layer.on('mouseover', () => {
            const currentFilter = filterLocRef.current;
            const isSelectedNow = currentFilter.toLowerCase().includes(region.id.toLowerCase());
            const isActiveFilter = currentFilter !== 'Barchasi';
            
            let isRegionActive = isSelectedNow;
            if (isActiveFilter && !isSelectedNow && districtsGeoJsonData) {
               const matched = findDistrictFeature(currentFilter);
               if (matched && matched.properties.regionId === region.id) {
                   isRegionActive = true;
               }
            }

            (layer as L.Path).setStyle({
              fillOpacity: isRegionActive ? 0.40 : 0.35,
              weight: isRegionActive ? 2.4 : 2.0,
              opacity: 0.85
            });
          });
          
          layer.on('mouseout', () => {
            const currentFilter = filterLocRef.current;
            const isSelectedNow = currentFilter.toLowerCase().includes(region.id.toLowerCase());
            const isActiveFilter = currentFilter !== 'Barchasi';
            
            let isRegionActive = isSelectedNow;
            if (isActiveFilter && !isSelectedNow && districtsGeoJsonData) {
               const matched = findDistrictFeature(currentFilter);
               if (matched && matched.properties.regionId === region.id) {
                   isRegionActive = true;
               }
            }

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
            
            (layer as L.Path).setStyle({
              fillColor: region.color,
              fillOpacity: fillOpacity,
              weight: weight,
              opacity: opacity
            });
          });
        }
      });
      regionsGeoJsonLayerRef.current = geoJsonLayer;
    }

    if (regionsGeoJsonLayerRef.current && !group.hasLayer(regionsGeoJsonLayerRef.current)) {
      regionsGeoJsonLayerRef.current.addTo(group);
    }
  }, [isMapReady, geoJsonData, mapInstanceRef, regionsGroupRef, districtsGeoJsonData]); // added deps for hooks
};
