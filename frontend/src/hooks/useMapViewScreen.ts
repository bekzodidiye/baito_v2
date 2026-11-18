import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useJobsData } from "../context/useJobsData";
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { translations } from '../translations';
import { UZBEKISTAN_REGIONS } from '../components/map/mapConstants';
import { useUzbekistanGeoJson } from '../components/map/useUzbekistanGeoJson';
import { useMapSetup } from '../components/map/useMapSetup';
import { useRegionPolygons } from '../components/map/useRegionPolygons';
import { useJobMarkers } from '../components/map/useJobMarkers';
import { useMapNavigation } from '../components/map/useMapNavigation';
import { useUserGeolocation } from '../components/map/useUserGeolocation';
import { useMapRoute } from '../components/map/useMapRoute';
import { useMapFilterJobs } from '../components/map/useMapFilterJobs';
import { useMapLocationAction } from '../components/map/useMapLocationAction';
import { useOpenJobDetail } from '../components/map/useOpenJobDetail';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";

export function useMapViewScreen() {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const jobsView = useUIStore(s => s.jobsView);
  const filterLocation = useUIStore(s => s.filterLocation);
    const setFilterLocation = useUIStore(s => s.setFilterLocation);
    const showRegionSelector = useUIStore(s => s.showRegionSelector);
    const setShowRegionSelector = useUIStore(s => s.setShowRegionSelector);
    const mapFocusedJobId = useUIStore(s => s.mapFocusedJobId);
    const setMapFocusedJobId = useUIStore(s => s.setMapFocusedJobId);
    const language = useAuthStore(s => s.language);
  const { jobs: rawJobs, toggleBookmark, applyToJob } = useJobsData({ isMap: true });

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
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsPanelExpanded(false);
      }
    },
    mapType,
    jobsView
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

  // Global custom event listener to trigger road route calculation (e.g. from marker popups or job cards)
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

  const { activeCluster, getDisplayedJobs, setActiveCluster } = useMapFilterJobs({
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

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
    getDisplayedJobs,
    handleRefresh,
    handleJobSelect,
    handleLocationAction,
    panToCoords
  };
}
