import { useState, useMemo, useCallback, useEffect } from 'react';
import { Job } from '../../types';
import { UZBEKISTAN_REGIONS } from './mapConstants';
import { areDistrictNamesEqual, isRegionName, getLatLng } from './mapUtils';

interface UseMapFilterJobsProps {
  jobs: Job[];
  filterLocation: string;
  geoJsonData: any;
  districtsGeoJsonData: any;
  panToCoords: (lat: number, lng: number, zoom: number) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  mapFocusedJobId: string | null;
  setMapFocusedJobId: (id: string | null) => void;
  setFilterLocation: (loc: string) => void;
  setSelectedJob: (job: Job | null) => void;
}

export function useMapFilterJobs({
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
}: UseMapFilterJobsProps) {
  const [activeCluster, setActiveCluster] = useState<'all' | 'cluster1' | 'cluster2'>('all');

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

  const availableJobs = useMemo(() => {
    return jobs.filter(job => {
      const hired = Number(job.hiredCount ?? 0);
      const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
      const isFilled = (hired >= vac) || ['completed'].includes(job.status);
      const isHiredOrActive = ['hired', 'confirmed', 'todo', 'in_progress', 'completed'].includes(job.status);
      return !isFilled && !isHiredOrActive;
    });
  }, [jobs]);

  const displayedJobs = useMemo((): Job[] => {
    let list = availableJobs;
    if (filterLocation === 'Barchasi') {
      if (activeCluster === 'cluster1') list = cluster1Jobs.filter(j => availableJobs.some(a => a.id === j.id));
      else if (activeCluster === 'cluster2') list = cluster2Jobs.filter(j => availableJobs.some(a => a.id === j.id));
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
  }, [availableJobs, filterLocation, activeCluster, cluster1Jobs, cluster2Jobs]);

  const getDisplayedJobs = useCallback((): Job[] => displayedJobs, [displayedJobs]);

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
  }, [filterLocation, geoJsonData, districtsGeoJsonData, panToCoords, setIsPanelExpanded]);

  useEffect(() => {
    if (mapFocusedJobId) {
      const job = jobs.find(j => j.id === mapFocusedJobId);
      if (job) {
        setSelectedJob(null);
        setIsPanelExpanded(false);
        
        const locStr = job.rawLocation || job.location;
        const district = locStr.includes(',') 
          ? locStr.split(',')[1].trim() 
          : locStr;
        setFilterLocation(district);

        const coords = getLatLng(job, districtsGeoJsonData);
        panToCoords(coords.lat, coords.lng, 15);
      }
      setMapFocusedJobId(null);
    }
  }, [mapFocusedJobId, jobs, setFilterLocation, setMapFocusedJobId, districtsGeoJsonData, panToCoords, setSelectedJob, setIsPanelExpanded]);

  return { activeCluster, displayedJobs, getDisplayedJobs, setActiveCluster };
}
