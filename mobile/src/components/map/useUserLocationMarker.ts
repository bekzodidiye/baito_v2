import React, { useEffect } from 'react';
import L from 'leaflet';
import { Job } from '../../types';
import { getLatLng } from './mapUtils';
import { Language } from '../../translations';

interface UseUserLocationMarkerProps {
  userGroupRef: React.MutableRefObject<L.LayerGroup | null>;
  userLocation: { lat: number; lng: number } | null;
  selectedJob: Job | null;
  language: Language;
  districtsGeoJsonData?: any;
  isVisible?: boolean;
}

export const useUserLocationMarker = ({
  userGroupRef,
  userLocation,
  selectedJob,
  language,
  districtsGeoJsonData,
  isVisible = true,
}: UseUserLocationMarkerProps) => {
  useEffect(() => {
    if (!isVisible) return;

    const userGroup = userGroupRef.current;
    if (!userGroup) return;

    userGroup.clearLayers();

    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
          <div class="w-4 h-4 bg-brand-primary rounded-full border-2 border-white shadow-lg relative z-10"></div>
          <span class="absolute w-8 h-8 rounded-full bg-brand-primary/40 animate-pulse"></span>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      
      const userLocationTooltip = language === 'ru' ? "Ваше местоположение" : language === 'en' ? "Your location" : "Sizning joylashuvingiz";

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindTooltip(userLocationTooltip, { permanent: false, direction: 'top' })
        .addTo(userGroup);

      if (selectedJob) {
        const jobCoords = getLatLng(selectedJob, districtsGeoJsonData);
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-primary').trim() || '#000666';
        L.polyline(
          [[userLocation.lat, userLocation.lng], [jobCoords.lat, jobCoords.lng]],
          {
            color: primaryColor,
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.8
          }
        ).addTo(userGroup);
      }
    }
  }, [userLocation, selectedJob, language, userGroupRef, districtsGeoJsonData, isVisible]);
};
