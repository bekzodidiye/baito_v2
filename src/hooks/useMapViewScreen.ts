import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { translations, translateRegion } from '../translations';
import { UZBEKISTAN_REGIONS } from '../components/map/mapConstants';
import { 
  areDistrictNamesEqual, 
  isRegionName, 
  isPointInFeature, 
  LNG_OFFSET, 
  LAT_OFFSET,
  getLatLng 
} from '../components/map/mapUtils';

import { useUzbekistanGeoJson } from '../components/map/useUzbekistanGeoJson';
import { useMapSetup } from '../components/map/useMapSetup';
import { useRegionPolygons } from '../components/map/useRegionPolygons';
import { useJobMarkers } from '../components/map/useJobMarkers';
import { useMapNavigation } from '../components/map/useMapNavigation';
import { useUserGeolocation } from '../components/map/useUserGeolocation';

export function useMapViewScreen() {
  const { 
    jobs: rawJobs, 
    toggleBookmark, 
    applyToJob,
    filterLocation,
    setFilterLocation,
    showRegionSelector,
    setShowRegionSelector,
    mapFocusedJobId,
    setMapFocusedJobId,
    language,
    currentScreen
  } = useApp();

  const jobs = useMemo(() => {
    return rawJobs.map(j => getTranslatedJob(j, language));
  }, [rawJobs, language]);

  const t = translations[language];

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeCluster, setActiveCluster] = useState<'all' | 'cluster1' | 'cluster2'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [mapType, setMapType] = useState<'xarita' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro'>('xarita');
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationToast, setLocationToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  
  const lastFittedLocationRef = useRef<string>('Barchasi');

  // Load GeoJSON bounds
  const { geoJsonData, districtsGeoJsonData } = useUzbekistanGeoJson();

  // Setup Leaflet Map Instance
  const {
    mapContainerRef,
    mapInstanceRef,
    markerGroupRef,
    regionsGroupRef,
    userGroupRef,
    labelsGroupRef,
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

  // Helper smoothly pan map to coordinates
  const panToCoords = useCallback((lat: number, lng: number, zoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom, { animate: true, duration: 0.8 });
    }
  }, [mapInstanceRef]);

  // Breadcrumbs and Navigation Back Controller Hook
  const {
    selectedRegion,
    breadcrumbItems,
    handleBreadcrumbBack,
  } = useMapNavigation({
    filterLocation,
    setFilterLocation,
    districtsGeoJsonData,
    panToCoords,
  });

  // User Geolocation and Distance Calculator Hook
  const {
    userLocation,
    isLocating,
    distanceToSelectedJob,
    handleCalculateDistance,
  } = useUserGeolocation({
    selectedJob,
    mapInstanceRef,
  });

  const isViloyatDashboard = selectedRegion !== undefined && (
    filterLocation.toLowerCase().includes('viloyat') || 
    filterLocation.toLowerCase().includes('respublika') ||
    filterLocation === 'Toshkent viloyati' || 
    filterLocation === 'Toshkent shahri' ||
    UZBEKISTAN_REGIONS.some(r => r.id === filterLocation)
  );

  const cluster1Jobs = useMemo(() => 
    jobs.filter(j => {
      const loc = j.rawLocation || j.location;
      return loc.includes('Yunusobod') || loc.includes('Bektemir');
    }),
    [jobs]
  );
  
  const cluster2Jobs = useMemo(() => 
    jobs.filter(j => {
      const loc = j.rawLocation || j.location;
      return loc.includes('Chilonzor');
    }),
    [jobs]
  );

  const getDisplayedJobs = useCallback((): Job[] => {
    let list = jobs;
    if (filterLocation === 'Barchasi') {
      if (activeCluster === 'cluster1') list = cluster1Jobs;
      else if (activeCluster === 'cluster2') list = cluster2Jobs;
    } else {
      const matchedRegion = UZBEKISTAN_REGIONS.find(r => 
        filterLocation.toLowerCase() === r.id.toLowerCase() ||
        filterLocation.toLowerCase() === r.name.toLowerCase() ||
        filterLocation.toLowerCase().includes(r.id.toLowerCase())
      );

      if (matchedRegion) {
        list = list.filter(j => {
          const loc = j.rawLocation || j.location;
          return loc.toLowerCase().includes(matchedRegion.id.toLowerCase()) ||
            loc.toLowerCase().includes(matchedRegion.name.toLowerCase()) ||
            (matchedRegion.id === 'Toshkent' && loc.toLowerCase().includes('toshkent'));
        });
      } else {
        list = list.filter(j => {
          const loc = j.rawLocation || j.location;
          return loc.toLowerCase().includes(filterLocation.toLowerCase()) ||
            areDistrictNamesEqual(loc, filterLocation);
        });
      }
    }
    return list;
  }, [jobs, filterLocation, activeCluster, cluster1Jobs, cluster2Jobs]);

  // Handle active location filter fitting
  useEffect(() => {
    if (filterLocation === 'Barchasi') {
      setActiveCluster('all');
      panToCoords(41.2, 64.0, 5.1);
      setIsPanelExpanded(false);
      return;
    }

    setIsPanelExpanded(false);

    if (isRegionName(filterLocation)) {
      setActiveCluster('all');
    } else if (geoJsonData && districtsGeoJsonData) {
      const matchedDistrict = districtsGeoJsonData.features.find((f: any) => 
        f.properties && areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
      );
      
      if (matchedDistrict && matchedDistrict.properties && matchedDistrict.properties.regionId === 'Toshkent') {
        const districtName = matchedDistrict.properties.shapeName.toLowerCase();
        const isC1 = ['yunusabad', 'mirzo ulugbek', 'yashnobod', 'mirabad', 'bektemir'].some(name => districtName.includes(name));
        setActiveCluster(isC1 ? 'cluster1' : 'cluster2');
      } else {
        setActiveCluster('all');
      }
    }
  }, [filterLocation, geoJsonData, districtsGeoJsonData, panToCoords]);

  // Hook to draw Uzbekistan Regions & Districts Polygons on map
  useRegionPolygons({
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
  });

  // Hook to render Job Markers & routing coordinates
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
    setIsPanelExpanded,
    getDisplayedJobs,
    language,
    districtsGeoJsonData,
    isVisible: currentScreen === 'xarita'
  });

  // Listen for map focusing request from other screens
  useEffect(() => {
    if (mapFocusedJobId) {
      const job = jobs.find(j => j.id === mapFocusedJobId);
      if (job) {
        setSelectedJob(null);
        setIsPanelExpanded(false);
        
        // Extract district and set it as active location filter
        const locStr = job.rawLocation || job.location;
        const district = locStr.includes(',') 
          ? locStr.split(',')[1].trim() 
          : locStr;
        setFilterLocation(district);

        // Fly map directly to the job coordinates
        const coords = getLatLng(job, districtsGeoJsonData);
        panToCoords(coords.lat, coords.lng, 15);
      }
      setMapFocusedJobId(null);
    }
  }, [mapFocusedJobId, jobs, setFilterLocation, setMapFocusedJobId, districtsGeoJsonData, panToCoords]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setIsPanelExpanded(true);
    window.dispatchEvent(new CustomEvent('open-job-detail', { detail: job.id }));
  };

  const handleLocationAction = () => {
    if (filterLocation !== 'Barchasi') {
      setActiveCluster('all');
      setSelectedJob(null);
      setFilterLocation('Barchasi');
      panToCoords(41.2, 64.0, 5.1);
      setIsPanelExpanded(false);
      return;
    }

    setIsLocatingUser(true);
    setLocationToast({ message: t.locatingYourself, type: 'info' });

    const processLocation = (lat: number, lng: number, isReal: boolean) => {
      // Apply offset to match shifted GeoJSON
      const shiftedLng = lng + LNG_OFFSET;
      const shiftedLat = lat + LAT_OFFSET;

      let foundDistrictName: string | null = null;

      if (districtsGeoJsonData && districtsGeoJsonData.features) {
        for (const feature of districtsGeoJsonData.features) {
          if (isPointInFeature(shiftedLng, shiftedLat, feature)) {
            foundDistrictName = feature.properties?.shapeName || null;
            break;
          }
        }
      }

      if (foundDistrictName) {
        setFilterLocation(foundDistrictName);
        setLocationToast({ 
          message: isReal 
            ? t.yourLocation.replace('{district}', translateRegion(foundDistrictName, language)) 
            : t.yourLocationDemo.replace('{district}', translateRegion(foundDistrictName, language)), 
          type: 'success' 
        });
        setIsLocatingUser(false);
        setTimeout(() => setLocationToast(null), 3500);
      } else {
        const defaultDistrict = "Yunusobod tumani";
        setFilterLocation(defaultDistrict);
        setLocationToast({ 
          message: t.outsideUzbekistan, 
          type: 'info' 
        });
        setIsLocatingUser(false);
        setTimeout(() => setLocationToast(null), 4000);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processLocation(pos.coords.latitude, pos.coords.longitude, true);
        },
        (error) => {
          console.warn("Geolocation error, using fallback:", error);
          processLocation(41.311081, 69.275, false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      processLocation(41.311081, 69.275, false);
    }
  };

  useEffect(() => {
    const handleOpenJobDetail = (e: Event) => {
      const customEvent = e as CustomEvent;
      const jobId = customEvent.detail;
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
      }
    };
    
    window.addEventListener('open-job-detail', handleOpenJobDetail);
    
    return () => {
      window.removeEventListener('open-job-detail', handleOpenJobDetail);
    };
  }, [jobs]);

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
    distanceToSelectedJob,
    handleCalculateDistance,
    getDisplayedJobs,
    handleRefresh,
    handleJobSelect,
    handleLocationAction,
    panToCoords
  };
}
