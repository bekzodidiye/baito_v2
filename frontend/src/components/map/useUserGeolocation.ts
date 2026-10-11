import React, { useState, useEffect } from 'react';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';

interface UseUserGeolocationProps {
  selectedJob: Job | null;
  map: google.maps.Map | null;
}

export const useUserGeolocation = ({
  selectedJob,
  map,
}: UseUserGeolocationProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceToSelectedJob, setDistanceToSelectedJob] = useState<string | null>(null);

  // Recalculate distance when selected job or user location updates
  useEffect(() => {
    if (selectedJob && userLocation) {
      const jobCoords = getLatLng(selectedJob);
      const dist = calculateDistance(userLocation.lat, userLocation.lng, jobCoords.lat, jobCoords.lng);
      setDistanceToSelectedJob(`${dist.toFixed(1)} km`);
    } else {
      setDistanceToSelectedJob(null);
    }
  }, [selectedJob, userLocation]);

  const handleCalculateDistance = () => {
    if (!selectedJob) return;
    const jobCoords = getLatLng(selectedJob);
    setIsLocating(true);

    const applyLocation = (lat: number, lng: number) => {
      const uLoc = { lat, lng };
      setUserLocation(uLoc);
      setIsLocating(false);
      const dist = calculateDistance(lat, lng, jobCoords.lat, jobCoords.lng);
      setDistanceToSelectedJob(`${dist.toFixed(1)} km`);

      if (map) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(lat, lng));
        bounds.extend(new google.maps.LatLng(jobCoords.lat, jobCoords.lng));
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyLocation(pos.coords.latitude, pos.coords.longitude),
        () => applyLocation(41.3142, 69.2612),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      applyLocation(41.3142, 69.2612);
    }
  };

  return {
    userLocation,
    setUserLocation,
    isLocating,
    distanceToSelectedJob,
    handleCalculateDistance,
  };
};
