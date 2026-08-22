import React, { useEffect } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { areDistrictNamesEqual, getDistrictColor } from './mapUtils';
import { translateRegion, Language } from '../../translations';
import { createDistrictOnEachFeature } from './districtFeatureUtils';

interface UseDistrictPolygonsProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  districtsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  currentDistrictsRegionIdRef: React.MutableRefObject<string | null>;
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  districtsGeoJsonData: any;
  jobs: Job[];
  lastFittedLocationRef: React.MutableRefObject<string>;
  language: Language;
  findDistrictFeature: (locationName: string) => any;
  getJobCountForLocation: (tumanName: string) => number;
  filterLocRef: React.MutableRefObject<string>;
}

export const useDistrictPolygons = ({
  mapInstanceRef,
  regionsGroupRef,
  districtsGeoJsonLayerRef,
  currentDistrictsRegionIdRef,
  filterLocation,
  setFilterLocation,
  setIsPanelExpanded,
  districtsGeoJsonData,
  jobs,
  lastFittedLocationRef,
  language,
  findDistrictFeature,
  getJobCountForLocation,
  filterLocRef
}: UseDistrictPolygonsProps) => {
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = regionsGroupRef.current;
    if (!map || !group || !districtsGeoJsonData) return;
    
    let selectedRegion = UZBEKISTAN_REGIONS.find(r => filterLocation.toLowerCase().includes(r.id.toLowerCase()));
    
    if (!selectedRegion) {
      const matchedDistrict = findDistrictFeature(filterLocation);
      if (matchedDistrict?.properties?.regionId) {
        selectedRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
      }
    }
    
    if (!selectedRegion) {
      if (districtsGeoJsonLayerRef.current) {
        group.removeLayer(districtsGeoJsonLayerRef.current);
        districtsGeoJsonLayerRef.current = null;
        currentDistrictsRegionIdRef.current = null;
      }
      return;
    }

    const isRegionFilterSelected = UZBEKISTAN_REGIONS.some(r => 
      filterLocation.toLowerCase() === r.id.toLowerCase() ||
      filterLocation.toLowerCase() === r.name.toLowerCase() ||
      filterLocation.toLowerCase().includes(r.id.toLowerCase() + ' viloyati') ||
      filterLocation.toLowerCase().includes(r.name.toLowerCase() + ' viloyati')
    );
    
    const isAnyDistrictOfThisRegionSelected = !isRegionFilterSelected && districtsGeoJsonData.features.some((f: any) => 
      f.properties && 
      f.properties.regionId === selectedRegion?.id && 
      areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
    );

    const getDistrictStyle = (feature: any) => {
      const tumanName = feature?.properties?.shapeName || "";
      const isSelected = !isRegionFilterSelected && areDistrictNamesEqual(filterLocation, tumanName);
      const districtColor = getDistrictColor(tumanName);
      
      let weight = 1.2;
      let opacity = 0.6;
      let fillOpacity = 0.18;
      
      if (isAnyDistrictOfThisRegionSelected) {
        if (isSelected) {
          weight = 2.4;
          opacity = 0.85;
          fillOpacity = 0.32;
        } else {
          weight = 1.0;
          opacity = 0.4;
          fillOpacity = 0.12;
        }
      }
      
      return {
        color: districtColor,
        weight: weight,
        opacity: opacity,
        fillColor: districtColor,
        fillOpacity: fillOpacity,
        fillRule: 'nonzero' as L.FillRule,
        fill: true
      };
    };

    if (districtsGeoJsonLayerRef.current && currentDistrictsRegionIdRef.current === selectedRegion.id) {
      districtsGeoJsonLayerRef.current.setStyle(getDistrictStyle);
      return;
    }

    if (districtsGeoJsonLayerRef.current) {
      group.removeLayer(districtsGeoJsonLayerRef.current);
      districtsGeoJsonLayerRef.current = null;
    }

    const filteredFeatures = districtsGeoJsonData.features.filter((f: any) => f.properties && f.properties.regionId === selectedRegion.id);
    
    if (filteredFeatures.length === 0) return;

    const districtJobsCount = new Map<string, number>();
    filteredFeatures.forEach((f: any) => {
      const tumanName = f.properties?.shapeName || "";
      if (!tumanName) return;
      districtJobsCount.set(tumanName, getJobCountForLocation(tumanName));
    });
    
    const districtsLayer = L.geoJSON({
      type: "FeatureCollection",
      features: filteredFeatures
    } as any, {
      style: getDistrictStyle,
      onEachFeature: createDistrictOnEachFeature(
        language,
        districtJobsCount,
        setFilterLocation,
        setIsPanelExpanded,
        map,
        lastFittedLocationRef,
        filterLocRef
      )
    });
    
    districtsGeoJsonLayerRef.current = districtsLayer;
    currentDistrictsRegionIdRef.current = selectedRegion.id;
    districtsLayer.addTo(group);
  }, [filterLocation, districtsGeoJsonData, jobs, language, mapInstanceRef, regionsGroupRef]);
};
