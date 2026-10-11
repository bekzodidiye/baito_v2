import { useState, useRef, useMemo, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { useJobsData } from "../context/useJobsData";
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { translations } from '../translations';
import { useUzbekistanGeoJson } from '../components/map/useUzbekistanGeoJson';
import { useMapNavigation } from '../components/map/useMapNavigation';
import { useUserGeolocation } from '../components/map/useUserGeolocation';
import { useMapFilterJobs } from '../components/map/useMapFilterJobs';
import { useMapLocationAction } from '../components/map/useMapLocationAction';
import { useOpenJobDetail } from '../components/map/useOpenJobDetail';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";

export function useMapViewScreen() {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const filterLocation = useUIStore(s => s.filterLocation);
  const setFilterLocation = useUIStore(s => s.setFilterLocation);
  const showRegionSelector = useUIStore(s => s.showRegionSelector);
  const setShowRegionSelector = useUIStore(s => s.setShowRegionSelector);
  const mapFocusedJobId = useUIStore(s => s.mapFocusedJobId);
  const setMapFocusedJobId = useUIStore(s => s.setMapFocusedJobId);
  const language = useAuthStore(s => s.language);
  const { jobs: rawJobs, toggleBookmark, applyToJob } = useJobsData();

  const jobs = useMemo(() => {
    return rawJobs.map(j => getTranslatedJob(j, language));
  }, [rawJobs, language]);

  const t = translations[language];

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [mapType, setMapType] = useState<'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro'>('jobs');
  
  const map = useMap(); // Get the Google Map instance

  const { geoJsonData, districtsGeoJsonData } = useUzbekistanGeoJson();

  const panToCoords = useCallback((lat: number, lng: number, zoom: number) => {
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(zoom);
    }
  }, [map]);

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
    handleCalculateDistance,
  } = useUserGeolocation({
    selectedJob,
    map,
  });

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
    isMapLoading: !map,
    isPanelExpanded,
    setIsPanelExpanded,
    mapType,
    setMapType,
    locationToast,
    breadcrumbItems,
    handleBreadcrumbBack,
    userLocation,
    isLocating,
    isLocatingUser,
    distanceToSelectedJob,
    handleCalculateDistance,
    getDisplayedJobs,
    handleRefresh,
    handleJobSelect,
    handleLocationAction,
    panToCoords,
    map,
    jobs,
    geoJsonData,
    districtsGeoJsonData,
  };
}
