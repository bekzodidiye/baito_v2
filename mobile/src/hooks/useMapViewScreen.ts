import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '../context/AppContext';
import { useJobsData } from "../context/useJobsData";
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { translations } from '../translations';
import { UZBEKISTAN_REGIONS } from '../components/map/mapConstants';
import { useUzbekistanGeoJson } from '../components/map/useUzbekistanGeoJson';
import { useMapSetup } from '../components/map/useMapSetup';
import { healMapTiles } from '../components/map/mapTileLayers';
import { useRegionPolygons } from '../components/map/useRegionPolygons';
import { useJobMarkers } from '../components/map/useJobMarkers';
import { useMapNavigation } from '../components/map/useMapNavigation';
import { useUserGeolocation } from '../components/map/useUserGeolocation';
import { useMapRoute } from '../components/map/useMapRoute';
import { useMapFilterJobs } from '../components/map/useMapFilterJobs';
import { useMapLocationAction } from '../components/map/useMapLocationAction';
import { useOpenJobDetail } from '../components/map/useOpenJobDetail';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

export function useMapViewScreen() {
  const { currentScreen } = useCurrentScreen();
  const { filterLocation, setFilterLocation, showRegionSelector, setShowRegionSelector, mapFocusedJobId, setMapFocusedJobId, language } = useApp();
  const { jobs: rawJobs, toggleBookmark, applyToJob } = useJobsData();

  const jobs = useMemo(() => {
    return rawJobs.map(j => getTranslatedJob(j, language));
  }, [rawJobs, language]);

  const t = translations[language];

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [mapType, setMapType] = useState<'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro'>('jobs');
  
  const lastFittedLocationRef = useRef<string>('Barchasi');

  const { geoJsonData, districtsGeoJsonData } = useUzbekistanGeoJson();

  const {
    mapContainerRef,
    mapInstanceRef,
    markerGroupRef,
    regionsGroupRef,
    userGroupRef,
    labelsGroupRef,
    routeGroupRef,
    zoomLevel,
    isMapLoading,
    isMapReady,
  } = useMapSetup({
    isPanelExpanded,
    isViloyatDashboard: filterLocation !== 'Barchasi' && UZBEKISTAN_REGIONS.some(r => filterLocation.toLowerCase().includes(r.id.toLowerCase())),
    onMapClick: () => {
      setSelectedJob(null);
      setIsPanelExpanded(false);
    },
    mapType
  });

  const panToCoords = useCallback((lat: number, lng: number, zoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom, { animate: true, duration: 0.8 });
    }
  }, [mapInstanceRef]);

  const { breadcrumbItems, handleBreadcrumbBack } = useMapNavigation({
    filterLocation,
    setFilterLocation,
    districtsGeoJsonData,
    panToCoords,
  });

  const {
    userLocation,
    isLocating,
    distanceToSelectedJob,
    activeRoute,
    handleCalculateDistance,
    handleReverseRoute,
    clearRoute,
  } = useUserGeolocation({
    selectedJob,
    mapInstanceRef,
  });

  useMapRoute({
    mapInstanceRef,
    routeGroupRef,
    activeRoute,
    isPanelExpanded,
  });

  // Global custom event listener to trigger road route calculation
  useEffect(() => {
    const handleRouteRequest = (e: CustomEvent<Job>) => {
      if (e.detail) {
        handleCalculateDistance(e.detail);
        setSelectedJob(null);
        setIsPanelExpanded(false);
      }
    };
    window.addEventListener('calculate-job-route', handleRouteRequest as EventListener);
    return () => {
      window.removeEventListener('calculate-job-route', handleRouteRequest as EventListener);
    };
  }, [handleCalculateDistance, setSelectedJob, setIsPanelExpanded]);

  const { activeCluster, displayedJobs, getDisplayedJobs, setActiveCluster } = useMapFilterJobs({
    jobs,
    filterLocation,
    geoJsonData,
    districtsGeoJsonData,
    panToCoords,
    setIsPanelExpanded,
    mapFocusedJobId,
    setMapFocusedJobId,
    setFilterLocation,
    setSelectedJob,
  });

  const { settledLocation } = useRegionPolygons({
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
  });

  useJobMarkers({
    mapInstanceRef,
    markerGroupRef,
    userGroupRef,
    activeCluster,
    jobs,
    selectedJob,
    setSelectedJob,
    userLocation,
    filterLocation,
    settledLocation,
    setIsPanelExpanded,
    getDisplayedJobs,
    language,
    districtsGeoJsonData,
    isVisible: currentScreen === 'jobs'
  });

  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    if (mapInstanceRef.current) {
      healMapTiles(mapInstanceRef.current);
    }
    setTimeout(() => setIsRefreshing(false), 800);
  }, [queryClient, mapInstanceRef]);

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setIsPanelExpanded(true);
    window.dispatchEvent(new CustomEvent('open-job-detail', { detail: job.id }));
  };

  const { isLocatingUser, locationToast, handleLocationAction } = useMapLocationAction({
    filterLocation,
    setFilterLocation,
    setActiveCluster,
    setSelectedJob,
    panToCoords,
    setIsPanelExpanded,
    districtsGeoJsonData,
    t,
    language
  });

  useOpenJobDetail(jobs, setSelectedJob);

  return {
    language,
    t,
    toggleBookmark,
    applyToJob,
    filterLocation,
    setFilterLocation,
    showRegionSelector,
    setShowRegionSelector,
    selectedJob,
    setSelectedJob,
    activeCluster,
    isRefreshing,
    isMapLoading,
    isPanelExpanded,
    setIsPanelExpanded,
    mapType,
    setMapType,
    locationToast,
    mapContainerRef,
    mapInstanceRef,
    breadcrumbItems,
    handleBreadcrumbBack,
    userLocation,
    isLocating,
    isLocatingUser,
    distanceToSelectedJob,
    activeRoute,
    clearRoute,
    handleCalculateDistance,
    handleReverseRoute,
    displayedJobs,
    getDisplayedJobs,
    handleRefresh,
    handleJobSelect,
    handleLocationAction,
    panToCoords
  };
}
