import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, getJobDates } from '../context/AppContext';
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { areDistrictNamesEqual, getLatLng, calculateDistance } from '../components/map/mapUtils';
import { translations, translateRegion } from '../translations';
import { useUzbekistanGeoJson } from '../components/map/useUzbekistanGeoJson';
import { getJobCategory } from '../utils/jobCategoryUtils';

export function useJobSearchScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { districtsGeoJsonData } = useUzbekistanGeoJson();
  const {
    jobs: rawJobs,
    toggleBookmark, 
    applyToJob,
    filterLocation,
    setFilterLocation,
    setShowRegionSelector,
    setCurrentScreen,
    language,
    activeCalendarDay
  } = useApp();

  const jobs = useMemo(() => {
    return rawJobs.map(j => getTranslatedJob(j, language));
  }, [rawJobs, language]);

  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Barchasi');
  const [filterCategory, setFilterCategory] = useState('Barchasi');
  const [sortBy, setSortBy] = useState<'yangilari' | 'maosh' | 'yaqin' | 'mos'>('yangilari');
  
  // Derive selectedJob from URL param
  const selectedJob = useMemo(() => {
    if (!id) return null;
    return jobs.find(j => j.id === id) || null;
  }, [jobs, id]);

  const setSelectedJob = useCallback((job: Job | null) => {
    if (job) {
      navigate(`/jobs/${job.id}`);
    } else {
      navigate('/qidiruv');
    }
  }, [navigate]);

  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const requestLocation = () => {
    setIsRequestingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setSortBy('yaqin');
          setIsRequestingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsRequestingLocation(false);
          // Fallback location (e.g. Tashkent center) if permission denied
          setUserLocation({ lat: 41.311081, lng: 69.240562 });
          setSortBy('yaqin');
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      setIsRequestingLocation(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 6);
      setIsLoadingMore(false);
    }, 200);
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, filterLocation, filterType, filterCategory, sortBy]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation =
        filterLocation === 'Barchasi' ||
        (job.rawLocation || job.location).toLowerCase().includes(filterLocation.toLowerCase()) ||
        areDistrictNamesEqual((job.rawLocation || job.location), filterLocation);
      const matchesType =
        filterType === 'Barchasi' ||
        job.tags.some(tag => tag.toLowerCase() === filterType.toLowerCase());

      const jobCatInfo = getJobCategory(job);
      const matchesCategory =
        filterCategory === 'Barchasi' ||
        job.category === filterCategory ||
        jobCatInfo.id === filterCategory;

      return matchesSearch && matchesLocation && matchesType && matchesCategory;
    });
  }, [jobs, searchTerm, filterLocation, filterType, filterCategory]);

  const sortedJobs = useMemo(() => {
    let result = [...filteredJobs];
    
    // Calculate distances if userLocation is available
    if (userLocation) {
      result = result.map(job => {
        const latLng = getLatLng(job, districtsGeoJsonData);
        const dist = calculateDistance(userLocation.lat, userLocation.lng, latLng.lat, latLng.lng);
        return { ...job, distanceKm: dist };
      });
    }

    if (sortBy === 'maosh') {
      result.sort((a, b) => {
        const aVal = parseInt(a.salary.replace(/[^0-9]/g, '')) || 0;
        const bVal = parseInt(b.salary.replace(/[^0-9]/g, '')) || 0;
        return bVal - aVal;
      });
    } else if (sortBy === 'yaqin' && userLocation) {
      result.sort((a, b) => {
        const aDist = a.distanceKm || 0;
        const bDist = b.distanceKm || 0;
        return aDist - bDist;
      });
    } else if (sortBy === 'mos') {
      result.sort((a, b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return 0;
      });
    }
    return result;
  }, [filteredJobs, sortBy, userLocation, districtsGeoJsonData]);

  const activeDesktopJob = selectedJob || sortedJobs[0] || null;

  const getJobsCountSummary = () => {
    const count = filteredJobs.length;
    if (filterLocation === 'Barchasi') {
      return count === 0 ? t.noJobsUzbekistan : t.jobsFoundUzbekistan.replace('{count}', count.toString());
    } else {
      const locName = translateRegion(filterLocation, language);
      return count === 0 
        ? t.noJobsInArea.replace('{location}', locName) 
        : t.jobsFoundInArea.replace('{location}', locName).replace('{count}', count.toString());
    }
  };

  const { hasActiveJobToday, applicationsTodayCount } = useMemo(() => {
    const todayStr = activeCalendarDay;
    
    const activeJob = jobs.find(j => {
      if (!['confirmed', 'todo', 'completed'].includes(j.status)) return false;
      return getJobDates(j.periodText).includes(todayStr);
    });

    const count = jobs.filter(j => {
      if (!(j.applied || j.status === 'applied')) return false;
      return getJobDates(j.periodText).includes(todayStr);
    }).length;

    return {
      hasActiveJobToday: !!activeJob,
      applicationsTodayCount: count
    };
  }, [jobs, activeCalendarDay]);

  const clearFilters = () => {
    setFilterLocation('Barchasi');
    setFilterType('Barchasi');
    setFilterCategory('Barchasi');
    setSearchTerm('');
  };

  return {
    jobs, language, t, toggleBookmark, applyToJob,
    filterLocation, setFilterLocation, setShowRegionSelector, setCurrentScreen,
    searchTerm, setSearchTerm, filterType, setFilterType,
    filterCategory, setFilterCategory,
    sortBy, setSortBy, selectedJob, setSelectedJob,
    visibleCount, isLoadingMore, isSortDropdownOpen, setIsSortDropdownOpen,
    filteredJobs, sortedJobs, activeDesktopJob, hasActiveJobToday,
    applicationsTodayCount, getJobsCountSummary, handleLoadMore,
    clearFilters, requestLocation, isRequestingLocation
  };
}
