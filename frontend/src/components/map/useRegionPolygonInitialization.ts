import React, { useEffect } from 'react';
import L from 'leaflet';
import { HOVERED, RESTING, outlineFor } from './regionOutlineStyle';
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
  isPanelExpandedRef?: React.MutableRefObject<boolean>;
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
  findDistrictFeature,
  isPanelExpandedRef
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
            ...RESTING,
            className: region ? `region-polygon-${region.id} leaflet-interactive-region` : 'leaflet-interactive-region'
          };
        },
        onEachFeature: (feature, layer) => {
          const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
          const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
          if (!region) return;
          
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setFilterLocationRef.current(region.id);
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsPanelExpandedRef.current(false);
            }
            if ((layer as any).getBounds) {
              const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
              const isExpanded = Boolean(isPanelExpandedRef?.current && isDesktop);
              const paddingRight = isExpanded ? 650 : 25;
              map.fitBounds((layer as any).getBounds(), {
                paddingTopLeft: [25, 75],
                paddingBottomRight: [paddingRight, 40],
                maxZoom: 9.5,
                animate: true,
                duration: 0.8
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

            (layer as L.Path).setStyle(HOVERED);
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

            (layer as L.Path).setStyle(outlineFor({
              isFiltering: isActiveFilter,
              isActive: isRegionActive,
            }));
          });
        }
      });
      regionsGeoJsonLayerRef.current = geoJsonLayer;

      // Initial framing: ensure entire Uzbekistan is cleanly centered in the visible map area
      if (geoJsonLayer.getBounds().isValid() && filterLocRef.current === 'Barchasi') {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        const isExpanded = Boolean(isPanelExpandedRef?.current && isDesktop);
        const paddingRight = isExpanded ? 650 : 25;
        map.fitBounds(geoJsonLayer.getBounds(), {
          paddingTopLeft: [25, 75],
          paddingBottomRight: [paddingRight, 40],
          maxZoom: 6.2,
          animate: false
        });
        lastFittedLocationRef.current = 'Barchasi';
      }
    }

    if (regionsGeoJsonLayerRef.current && !group.hasLayer(regionsGeoJsonLayerRef.current)) {
      regionsGeoJsonLayerRef.current.addTo(group);
    }
  }, [isMapReady, geoJsonData, mapInstanceRef, regionsGroupRef, districtsGeoJsonData]); // added deps for hooks
};
