import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { Language } from '../../translations';
import { areDistrictNamesEqual, mapFeatureToRegionId, getFeatureBounds } from './mapUtils';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { useLocationCountsQuery } from '../../context/useJobsData';
import { useRegionPolygonInitialization } from './useRegionPolygonInitialization';
import { useRegionPolygonStyleUpdate } from './useRegionPolygonStyleUpdate';
import { useDistrictPolygons } from './useDistrictPolygons';
import { useFitBounds } from './useFitBounds';
import { useMapLabels } from './useMapLabels';

interface UseRegionPolygonsProps {
  isMapReady: boolean;
  mapInstanceRef: React.MutableRefObject<L.Map | null>;
  regionsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  labelsGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  isPanelExpanded?: boolean;
  geoJsonData: any;
  districtsGeoJsonData: any;
  zoomLevel: number;
  jobs: Job[];
  lastFittedLocationRef: React.MutableRefObject<string>;
  language: Language;
}

export const useRegionPolygons = ({
  isMapReady,
  mapInstanceRef,
  regionsGroupRef,
  labelsGroupRef,
  filterLocation,
  setFilterLocation,
  setIsPanelExpanded,
  isPanelExpanded,
  geoJsonData,
  districtsGeoJsonData,
  zoomLevel,
  jobs,
  lastFittedLocationRef,
  language,
}: UseRegionPolygonsProps) => {
  const regionsGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const districtsGeoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const currentDistrictsRegionIdRef = useRef<string | null>(null);
  
  const filterLocRef = useRef(filterLocation);
  const districtCentersRef = useRef(new Map<string, [number, number]>());
  const regionCentersRef = useRef(new Map<string, [number, number]>());
  const setFilterLocationRef = useRef(setFilterLocation);
  const setIsPanelExpandedRef = useRef(setIsPanelExpanded);
  const isPanelExpandedRef = useRef(isPanelExpanded ?? false);
  
  useEffect(() => { filterLocRef.current = filterLocation; }, [filterLocation]);
  useEffect(() => { setFilterLocationRef.current = setFilterLocation; }, [setFilterLocation]);
  useEffect(() => { setIsPanelExpandedRef.current = setIsPanelExpanded; }, [setIsPanelExpanded]);
  useEffect(() => { isPanelExpandedRef.current = isPanelExpanded ?? false; }, [isPanelExpanded]);

  const { data: locationCounts } = useLocationCountsQuery();

  const fallbackJobCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!jobs || jobs.length === 0) return map;
    for (const j of jobs) {
      const loc = (j.rawLocation || j.location || '').toLowerCase();
      if (!loc) continue;
      const parts = loc.split(/[,;\s]+/).filter(Boolean);
      for (const p of parts) {
        map.set(p, (map.get(p) || 0) + 1);
      }
      map.set(loc, (map.get(loc) || 0) + 1);
    }
    return map;
  }, [jobs]);

  const getJobCountForLocation = useCallback((tumanName: string): number => {
    if (!tumanName) return 0;
    const cleanName = tumanName.trim();
    if (locationCounts) {
      if (locationCounts.districts && locationCounts.districts[cleanName] !== undefined) {
        return locationCounts.districts[cleanName];
      }
      if (locationCounts.regions && locationCounts.regions[cleanName] !== undefined) {
        return locationCounts.regions[cleanName];
      }
      const lower = cleanName.toLowerCase();
      if (locationCounts.districts && locationCounts.districts[lower] !== undefined) {
        return locationCounts.districts[lower];
      }
      if (locationCounts.regions && locationCounts.regions[lower] !== undefined) {
        return locationCounts.regions[lower];
      }
    }
    const lowerName = cleanName.toLowerCase();
    const cached = fallbackJobCountsMap.get(lowerName);
    if (cached !== undefined) return cached;

    if (jobs && jobs.length > 0) {
      let matched = 0;
      for (let i = 0; i < jobs.length; i++) {
        const j = jobs[i];
        const loc = (j.rawLocation || j.location || "").toLowerCase();
        if (loc && (loc.includes(lowerName) || areDistrictNamesEqual(loc, tumanName))) {
          matched++;
        }
      }
      fallbackJobCountsMap.set(lowerName, matched);
      return matched;
    }
    return 0;
  }, [locationCounts, fallbackJobCountsMap, jobs]);
  
  const districtFeatureMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!districtsGeoJsonData || !districtsGeoJsonData.features) return map;
    districtsGeoJsonData.features.forEach((f: any) => {
      const shapeName = f.properties?.shapeName;
      if (shapeName) {
        map.set(shapeName.toLowerCase(), f);
      }
    });
    return map;
  }, [districtsGeoJsonData]);

  const findDistrictFeature = (locationName: string) => {
    if (!locationName || locationName === 'Barchasi') return null;
    const exact = districtFeatureMap.get(locationName.toLowerCase());
    if (exact) return exact;
    if (!districtsGeoJsonData?.features) return null;
    return districtsGeoJsonData.features.find((f: any) =>
      f.properties && areDistrictNamesEqual(locationName, f.properties.shapeName || "")
    ) || null;
  };

  useRegionPolygonInitialization({
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
  });

  useRegionPolygonStyleUpdate({
    isMapReady,
    regionsGeoJsonLayerRef,
    filterLocation,
    districtsGeoJsonData,
    findDistrictFeature
  });

  useDistrictPolygons({
    mapInstanceRef,
    regionsGroupRef,
    districtsGeoJsonLayerRef,
    currentDistrictsRegionIdRef,
    filterLocation,
    setFilterLocation: setFilterLocationRef.current,
    setIsPanelExpanded: setIsPanelExpandedRef.current,
    districtsGeoJsonData,
    jobs,
    lastFittedLocationRef,
    language,
    findDistrictFeature,
    getJobCountForLocation,
    filterLocRef,
    isPanelExpandedRef
  });

  useFitBounds({
    isMapReady,
    mapInstanceRef,
    regionsGeoJsonLayerRef,
    districtsGeoJsonLayerRef,
    filterLocation,
    lastFittedLocationRef,
    geoJsonData,
    districtsGeoJsonData,
    isPanelExpanded
  });

  useEffect(() => {
    if (!geoJsonData || !geoJsonData.features) return;
    geoJsonData.features.forEach((feature: any) => {
      const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
      const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
      if (!region) return;
      if (!regionCentersRef.current.has(region.id)) {
        if (region.center) {
          regionCentersRef.current.set(region.id, region.center);
        } else if (feature.geometry) {
          const b = getFeatureBounds(feature.geometry);
          regionCentersRef.current.set(region.id, [(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2]);
        }
      }
    });
  }, [geoJsonData]);

  useEffect(() => {
    if (!districtsGeoJsonData || !districtsGeoJsonData.features) return;
    districtsGeoJsonData.features.forEach((f: any) => {
      const tumanName = f.properties?.shapeName || "";
      if (!tumanName || districtCentersRef.current.has(tumanName)) return;
      if (f.geometry) {
        const b = getFeatureBounds(f.geometry);
        districtCentersRef.current.set(tumanName, [(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2]);
      }
    });
  }, [districtsGeoJsonData]);

  useMapLabels({
    isMapReady,
    mapInstanceRef,
    labelsGroupRef,
    filterLocation,
    zoomLevel,
    geoJsonData,
    districtsGeoJsonData,
    language,
    jobs,
    regionCentersRef,
    districtCentersRef,
    findDistrictFeature,
    getJobCountForLocation,
    setFilterLocation: (loc: string) => setFilterLocationRef.current(loc),
    setIsPanelExpanded: (expanded: boolean) => setIsPanelExpandedRef.current(expanded),
    lastFittedLocationRef,
    isPanelExpandedRef
  });
};
