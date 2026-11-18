import React, { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';
import { fetchRoute, RouteInfo } from '../../services/routingService';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getJobLocation } from '../../utils/jobTranslationUtils';

interface UseUserGeolocationProps {
  selectedJob: Job | null;
  mapInstanceRef?: React.MutableRefObject<L.Map | null>;
  districtsGeoJsonData?: any;
}

export const useUserGeolocation = ({
  selectedJob,
  districtsGeoJsonData,
}: UseUserGeolocationProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToSelectedJob, setDistanceToSelectedJob] = useState<string | null>(null);

  const language = useAuthStore(s => s.language);
  const activeRoute = useUIStore(s => s.activeRoute);
  const setActiveRoute = useUIStore(s => s.setActiveRoute);

  // Recalculate distance when selected job or user location updates
  useEffect(() => {
    if (selectedJob && userLocation) {
      const jobCoords = getLatLng(selectedJob, districtsGeoJsonData);
      const dist = calculateDistance(userLocation.lat, userLocation.lng, jobCoords.lat, jobCoords.lng);
      setDistanceToSelectedJob(`${dist.toFixed(1)} km`);
    } else {
      setDistanceToSelectedJob(null);
    }
  }, [selectedJob, userLocation, districtsGeoJsonData]);

  const handleCalculateRoute = useCallback(async (targetJob?: Job | null) => {
    const job = targetJob || selectedJob;
    if (!job) return;

    const jobCoords = getLatLng(job, districtsGeoJsonData);
    setIsLocating(true);

    const resolveRoute = async (uLat: number, uLng: number) => {
      setUserLocation({ lat: uLat, lng: uLng });
      const jobLocName = getJobLocation(job, language) || job.location || job.rawLocation || '';
      const destName = job.company ? `${job.company} (${jobLocName})` : jobLocName;

      try {
        const route = await fetchRoute(
          { lat: uLat, lng: uLng },
          { lat: jobCoords.lat, lng: jobCoords.lng, name: destName, company: job.company },
          language
        );

        setActiveRoute(route);
        setDistanceToSelectedJob(route.distanceText);
      } catch (e) {
        console.error('Failed to resolve route:', e);
      } finally {
        setIsLocating(false);
      }
    };

    if (userLocation) {
      await resolveRoute(userLocation.lat, userLocation.lng);
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolveRoute(pos.coords.latitude, pos.coords.longitude),
        () => resolveRoute(41.3142, 69.2612), // default Tashkent center fallback
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      await resolveRoute(41.3142, 69.2612);
    }
  }, [selectedJob, userLocation, language, districtsGeoJsonData, setActiveRoute]);

  const handleReverseRoute = useCallback(async () => {
    if (!activeRoute) return;
    setIsLocating(true);
    try {
      const reversed = await fetchRoute(
        { lat: activeRoute.destination.lat, lng: activeRoute.destination.lng, name: activeRoute.destination.name },
        { lat: activeRoute.origin.lat, lng: activeRoute.origin.lng, name: activeRoute.origin.name },
        language
      );
      setActiveRoute(reversed);
      setDistanceToSelectedJob(reversed.distanceText);
    } catch (e) {
      console.error('Failed to reverse route:', e);
    } finally {
      setIsLocating(false);
    }
  }, [activeRoute, language, setActiveRoute]);

  const clearRoute = useCallback(() => {
    setActiveRoute(null);
  }, [setActiveRoute]);

  return {
    userLocation,
    setUserLocation,
    isLocating,
    distanceToSelectedJob,
    activeRoute,
    handleCalculateDistance: handleCalculateRoute,
    calculateRoute: handleCalculateRoute,
    handleReverseRoute,
    clearRoute,
  };
};
