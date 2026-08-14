import { useMemo } from 'react';
import { Job } from '../types';
import { areDistrictNamesEqual, getLatLng, calculateDistance } from '../components/map/mapUtils';
import { getJobCategory } from '../utils/jobCategoryUtils';

interface UseJobSearchFiltersProps {
  jobs: Job[];
  searchTerm: string;
  filterLocation: string;
  filterType: string;
  filterCategory: string;
  sortBy: 'yangilari' | 'maosh' | 'yaqin' | 'mos';
  userLocation: { lat: number, lng: number } | null;
  districtsGeoJsonData: any;
}

export function useJobSearchFilters({
  jobs,
  searchTerm,
  filterLocation,
  filterType,
  filterCategory,
  sortBy,
  userLocation,
  districtsGeoJsonData
}: UseJobSearchFiltersProps) {
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

      const hired = Number(job.hiredCount ?? 0);
      const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
      const isFilled = (hired >= vac) || ['completed'].includes(job.status);
      const isHiredOrActive = ['hired', 'confirmed', 'todo', 'in_progress', 'completed'].includes(job.status);

      const isAvailable = !isFilled && !isHiredOrActive;

      return matchesSearch && matchesLocation && matchesType && matchesCategory && isAvailable;
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

  return { filteredJobs, sortedJobs };
}
