import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { Job } from '../../types';
import { calculateDistance, getLatLng } from './mapUtils';
import { Language } from '../../translations';

interface UserLocationMarkerProps {
  userLocation: { lat: number; lng: number } | null;
  selectedJob: Job | null;
  language: Language;
}

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  userLocation,
  selectedJob,
  language
}) => {
  if (!userLocation) return null;

  return (
    <AdvancedMarker
      position={userLocation}
      zIndex={9999}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute w-8 h-8 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
        <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
      </div>
    </AdvancedMarker>
  );
};
