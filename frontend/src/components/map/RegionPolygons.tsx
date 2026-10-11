import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { Job } from '../../types';
import { Language } from '../../translations';
import { areDistrictNamesEqual, mapFeatureToRegionId } from './mapUtils';

interface RegionPolygonsProps {
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  geoJsonData: any;
  districtsGeoJsonData: any;
  zoomLevel: number;
  jobs: Job[];
  language: Language;
}

export const RegionPolygons: React.FC<RegionPolygonsProps> = ({
  filterLocation,
  setFilterLocation,
  setIsPanelExpanded,
  geoJsonData,
  districtsGeoJsonData,
  zoomLevel,
  jobs,
  language,
}) => {
  const map = useMap();
  const regionsLoaded = useRef(false);
  const districtsLoaded = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (geoJsonData && !regionsLoaded.current) {
      map.data.addGeoJson(geoJsonData);
      regionsLoaded.current = true;
    }
    
    if (districtsGeoJsonData && !districtsLoaded.current) {
      map.data.addGeoJson(districtsGeoJsonData);
      districtsLoaded.current = true;
    }

    // Define styles
    map.data.setStyle((feature) => {
      const isDistrict = feature.getProperty('shapeName') !== undefined;
      const rawRegionId = feature.getProperty('ADM1_EN') as string;
      const mappedRegionId = rawRegionId ? mapFeatureToRegionId(rawRegionId) : '';
      
      const adm1Uz = feature.getProperty('ADM1_UZ') as string;
      const shapeName = feature.getProperty('shapeName') as string;
      const isSelectedRegion = filterLocation !== 'Barchasi' && (
        filterLocation.toLowerCase().includes(mappedRegionId.toLowerCase()) || 
        filterLocation.toLowerCase().includes((rawRegionId || '').toLowerCase()) ||
        (adm1Uz && filterLocation.toLowerCase().includes(adm1Uz.toLowerCase()))
      );

      const isSelectedDistrict = filterLocation !== 'Barchasi' && areDistrictNamesEqual(filterLocation, shapeName || '');

      // Base style
      let style: google.maps.Data.StyleOptions = {
        visible: false,
        strokeColor: '#3B82F6',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillOpacity: 0,
      };

      if (!isDistrict) {
        if (filterLocation === 'Barchasi') {
          style.visible = true;
        } else if (isSelectedRegion) {
          style.visible = true;
          style.strokeWeight = 3;
        }
      } else {
        // District logic
        const parentRegionId = feature.getProperty('regionId') as string;
        if (filterLocation !== 'Barchasi' && !isSelectedRegion) {
          // Check if parent region matches selected region
          if (filterLocation.toLowerCase().includes((parentRegionId || '').toLowerCase())) {
            style.visible = true;
          }
          if (isSelectedDistrict) {
            style.visible = true;
            style.strokeWeight = 2;
          }
        }
      }

      return style;
    });

    const clickListener = map.data.addListener('click', (event: any) => {
      const feature = event.feature;
      const isDistrict = feature.getProperty('shapeName') !== undefined;

      if (!isDistrict) {
        const rawRegionId = feature.getProperty('ADM1_EN');
        const mappedRegionId = rawRegionId ? mapFeatureToRegionId(rawRegionId) : '';
        if (mappedRegionId) {
          setFilterLocation(mappedRegionId);
          setIsPanelExpanded(false);
          // bounds calculation would be done here by a helper
        }
      } else {
        const shapeName = feature.getProperty('shapeName');
        if (shapeName) {
          setFilterLocation(shapeName);
          setIsPanelExpanded(false);
        }
      }
    });

    const mouseOverListener = map.data.addListener('mouseover', (event: any) => {
      map.data.overrideStyle(event.feature, {
        fillOpacity: 0.4,
        strokeWeight: 3
      });
    });

    const mouseOutListener = map.data.addListener('mouseout', (event: any) => {
      map.data.revertStyle(event.feature);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(mouseOverListener);
      google.maps.event.removeListener(mouseOutListener);
    };
  }, [map, geoJsonData, districtsGeoJsonData, filterLocation, setFilterLocation, setIsPanelExpanded]);

  return null;
};
