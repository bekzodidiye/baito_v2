import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { Language } from '../../translations';
import { areDistrictNamesEqual, mapFeatureToRegionId, getFeatureCenter } from './mapUtils';
import { UZBEKISTAN_REGIONS } from './mapConstants';
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
  
  useEffect(() => { filterLocRef.current = filterLocation; }, [filterLocation]);
  useEffect(() => { setFilterLocationRef.current = setFilterLocation; }, [setFilterLocation]);
  useEffect(() => { setIsPanelExpandedRef.current = setIsPanelExpanded; }, [setIsPanelExpanded]);

  const getJobCountForLocation = useCallback((tumanName: string) => {
    if (!jobs || jobs.length === 0) return 0;
    const lowerName = tumanName.toLowerCase();
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      const loc = (jobs[i].rawLocation || jobs[i].location || "").toLowerCase();
      if (loc && (loc.includes(lowerName) || areDistrictNamesEqual(loc, tumanName))) {
        count++;
      }
    }
    return count;
  }, [jobs]);

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

  const findDistrictFeature = useCallback((locationName: string) => {
    if (!locationName || locationName === 'Barchasi') return null;
    const exact = districtFeatureMap.get(locationName.toLowerCase());
    if (exact) return exact;
    if (!districtsGeoJsonData?.features) return null;
    return districtsGeoJsonData.features.find((f: any) =>
      f.properties && areDistrictNamesEqual(locationName, f.properties.shapeName || "")
    ) || null;
  }, [districtFeatureMap, districtsGeoJsonData]);

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
    findDistrictFeature
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
    filterLocRef
  });

  useFitBounds({
    isMapReady,
    mapInstanceRef,
    regionsGeoJsonLayerRef,
    districtsGeoJsonLayerRef,
    filterLocation,
    lastFittedLocationRef,
    geoJsonData,
    districtsGeoJsonData
  });

  useEffect(() => {
    if (!geoJsonData || !geoJsonData.features) return;
    geoJsonData.features.forEach((feature: any) => {
      const regionId = mapFeatureToRegionId(feature?.properties?.ADM1_EN || "");
      const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
      if (!region) return;
      if (!regionCentersRef.current.has(region.id)) {
        const center = getFeatureCenter(feature.geometry);
        if (center && (center.lat !== 41.3 || center.lng !== 69.2)) {
          regionCentersRef.current.set(region.id, [center.lat, center.lng]);
        } else if (region.center) {
          regionCentersRef.current.set(region.id, region.center);
        }
      }
    });
  }, [geoJsonData]);

  useEffect(() => {
    if (!districtsGeoJsonData || !districtsGeoJsonData.features) return;
    districtsGeoJsonData.features.forEach((f: any) => {
      const tumanName = f.properties?.shapeName || "";
      if (!tumanName || districtCentersRef.current.has(tumanName)) return;
      const center = getFeatureCenter(f.geometry);
      if (center) {
        districtCentersRef.current.set(tumanName, [center.lat, center.lng]);
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
    getJobCountForLocation
  });
};
