import { useState } from 'react';
import { isPointInFeature, LNG_OFFSET, LAT_OFFSET } from './mapUtils';
import { translateRegion } from '../../translations';

interface UseMapLocationActionProps {
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  setActiveCluster: (cluster: 'all' | 'cluster1' | 'cluster2') => void;
  setSelectedJob: (job: any) => void;
  panToCoords: (lat: number, lng: number, zoom: number) => void;
  setIsPanelExpanded: (expanded: boolean) => void;
  districtsGeoJsonData: any;
  t: any;
  language: 'uz' | 'ru' | 'en';
}

export function useMapLocationAction({
  filterLocation,
  setFilterLocation,
  setActiveCluster,
  setSelectedJob,
  panToCoords,
  setIsPanelExpanded,
  districtsGeoJsonData,
  t,
  language
}: UseMapLocationActionProps) {
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationToast, setLocationToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

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

  return { isLocatingUser, locationToast, handleLocationAction };
}
