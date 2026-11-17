import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { outlineFor } from './regionOutlineStyle';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { areDistrictNamesEqual } from './mapUtils';
import { Language } from '../../translations';
import { createDistrictOnEachFeature } from './districtFeatureUtils';

interface UseDistrictPolygonsProps {
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  districtsGeoJsonLayerRef: React.MutableRefObject<L.GeoJSON | null>;
  currentDistrictsRegionIdRef: React.MutableRefObject<string | null>;
  filterLocation: string;
  settledLocation?: string;
  setFilterLocation: (loc: string) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  districtsGeoJsonData: any;
  jobs: Job[];
  lastFittedLocationRef: React.MutableRefObject<string>;
  language: Language;
  findDistrictFeature: (locationName: string) => any;
  getJobCountForLocation: (tumanName: string) => number;
  filterLocRef: React.MutableRefObject<string>;
  isPanelExpandedRef?: React.MutableRefObject<boolean>;
}

export const useDistrictPolygons = ({
  mapInstanceRef,
  regionsGroupRef,
  districtsGeoJsonLayerRef,
  currentDistrictsRegionIdRef,
  filterLocation,
  settledLocation,
  setFilterLocation,
  setIsPanelExpanded,
  districtsGeoJsonData,
  jobs,
  lastFittedLocationRef,
  language,
  findDistrictFeature,
  getJobCountForLocation,
  filterLocRef,
  isPanelExpandedRef
}: UseDistrictPolygonsProps) => {
  const getJobCountRef = useRef(getJobCountForLocation);
  useEffect(() => {
    getJobCountRef.current = getJobCountForLocation;
  }, [getJobCountForLocation]);

  const jobsCountSignature = React.useMemo(() => {
    if (!jobs || jobs.length === 0) return '0';
    return `${jobs.length}-${jobs.filter(j => j.status === 'open').length}`;
  }, [jobs]);

  const districtLayersCacheRef = useRef<Map<string, L.GeoJSON>>(new Map());

  // Pre-warm district layers in the background during browser idle time
  // so that future region transitions take < 1ms
  useEffect(() => {
    if (!districtsGeoJsonData?.features || !mapInstanceRef.current) return;
    const currentMap = mapInstanceRef.current;
    let cancelled = false;
    let currentIndex = 0;

    const buildRegion = (region: typeof UZBEKISTAN_REGIONS[0]) => {
      if (districtLayersCacheRef.current.has(region.id)) return;
      const features = districtsGeoJsonData.features.filter(
        (f: any) => f.properties && f.properties.regionId === region.id
      );
      if (features.length > 0) {
        const onEach = createDistrictOnEachFeature(
          language,
          new Map(),
          setFilterLocation,
          setIsPanelExpanded,
          currentMap,
          lastFittedLocationRef,
          filterLocRef,
          isPanelExpandedRef
        );
        const layer = L.geoJSON({
          type: "FeatureCollection",
          features
        } as any, {
          style: () => {
            const base = outlineFor({ isFiltering: false, isActive: false });
            return { ...base, weight: base.weight * 0.8, className: 'leaflet-interactive-district' };
          },
          onEachFeature: onEach
        });
        districtLayersCacheRef.current.set(region.id, layer);
      }
    };

    const runChunk = (deadline?: IdleDeadline) => {
      if (cancelled) return;
      const start = performance.now();
      while (currentIndex < UZBEKISTAN_REGIONS.length) {
        buildRegion(UZBEKISTAN_REGIONS[currentIndex]);
        currentIndex++;
        if (deadline && typeof deadline.timeRemaining === 'function') {
          if (deadline.timeRemaining() < 4) break;
        } else if (performance.now() - start > 12) {
          break;
        }
      }

      if (currentIndex < UZBEKISTAN_REGIONS.length && !cancelled) {
        scheduleNext();
      }
    };

    let idleId: any = null;
    let timeoutId: any = null;

    const scheduleNext = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(runChunk, { timeout: 300 });
      } else {
        timeoutId = setTimeout(() => runChunk(), 0);
      }
    };

    timeoutId = setTimeout(scheduleNext, 50);

    return () => {
      cancelled = true;
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [districtsGeoJsonData, language, mapInstanceRef]);

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
      const base = outlineFor({
        isFiltering: isAnyDistrictOfThisRegionSelected,
        isActive: isSelected,
      });
      return { 
        ...base, 
        weight: base.weight * 0.8,
        className: 'leaflet-interactive-district'
      };
    };

    // If districts of this region are ALREADY mounted, just update styles (fast 1ms path)
    if (districtsGeoJsonLayerRef.current && currentDistrictsRegionIdRef.current === selectedRegion.id) {
      districtsGeoJsonLayerRef.current.setStyle(getDistrictStyle);
      return;
    }

    // If changing to a new region, remove old districts immediately to keep map clean during camera fly
    if (districtsGeoJsonLayerRef.current) {
      group.removeLayer(districtsGeoJsonLayerRef.current);
      districtsGeoJsonLayerRef.current = null;
      currentDistrictsRegionIdRef.current = null;
    }

    // Defer heavy district SVG construction until camera settles on the new region
    const activeLocation = settledLocation || filterLocation;
    const isSettledOnThisRegion = activeLocation.toLowerCase().includes(selectedRegion.id.toLowerCase()) ||
      (findDistrictFeature(activeLocation)?.properties?.regionId === selectedRegion.id);

    if (!isSettledOnThisRegion && settledLocation !== undefined) {
      // Waiting for camera to finish flying
      return;
    }

    const attachDistricts = () => {
      if (!mapInstanceRef.current || !regionsGroupRef.current) return;
      const currentMap = mapInstanceRef.current;
      const currentGroup = regionsGroupRef.current;

      let districtsLayer = districtLayersCacheRef.current.get(selectedRegion.id);

      if (!districtsLayer) {
        const filteredFeatures = districtsGeoJsonData.features.filter((f: any) => f.properties && f.properties.regionId === selectedRegion.id);
        if (filteredFeatures.length === 0) return;

        const onEach = createDistrictOnEachFeature(
          language,
          new Map(),
          setFilterLocation,
          setIsPanelExpanded,
          currentMap,
          lastFittedLocationRef,
          filterLocRef,
          isPanelExpandedRef
        );
        districtsLayer = L.geoJSON({
          type: "FeatureCollection",
          features: filteredFeatures
        } as any, {
          style: getDistrictStyle,
          onEachFeature: onEach
        });
        districtLayersCacheRef.current.set(selectedRegion.id, districtsLayer);
      } else {
        districtsLayer.setStyle(getDistrictStyle);
      }
      
      districtsGeoJsonLayerRef.current = districtsLayer;
      currentDistrictsRegionIdRef.current = selectedRegion.id;
      if (!currentGroup.hasLayer(districtsLayer)) {
        districtsLayer.addTo(currentGroup);
      }
    };

    attachDistricts();
  }, [
    filterLocation,
    settledLocation,
    districtsGeoJsonData,
    jobsCountSignature,
    language,
    mapInstanceRef,
    regionsGroupRef
  ]);
};
