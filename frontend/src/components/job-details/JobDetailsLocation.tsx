import React, { useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Job } from '../../types';
import { getLatLng } from '../map/mapUtils';
import { translations } from '../../translations';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getJobLocation } from '../../utils/jobTranslationUtils';

interface JobDetailsLocationProps {
  selectedJob: Job;
  onOpenOnMap?: () => void;
  distanceToSelectedJob?: string | null;
  handleCalculateDistance?: () => void;
  isLocating?: boolean;
}

export const JobDetailsLocation: React.FC<JobDetailsLocationProps> = ({
  selectedJob,
  onOpenOnMap,
  distanceToSelectedJob,
  handleCalculateDistance,
  isLocating,
}) => {
  const { setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const setMapFocusedJobId = useUIStore(s => s.setMapFocusedJobId);
  const setJobsView = useUIStore(s => s.setJobsView);
  const t = translations[language];

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const handleMapButtonClick = () => {
    if (onOpenOnMap) {
      onOpenOnMap();
    } else {
      setMapFocusedJobId(selectedJob.id);
      setJobsView('map');
      setCurrentScreen('jobs');
    }
  };

  const coords = getLatLng(selectedJob);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([coords.lat, coords.lng], 15);
      return;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;

      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      return () => {
        clearTimeout(timer);
        map.remove();
        leafletMapRef.current = null;
      };
    } catch {
      // Graceful fallback in SSR / headless test environments
    }
  }, [coords.lat, coords.lng]);

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-brand-primary tracking-tight">
          {t.address || "Manzil"}
        </h3>
        <button
          onClick={handleMapButtonClick}
          className="text-brand-primary text-sm font-semibold flex items-center gap-1 hover:underline cursor-pointer"
        >
          {t.openOnMap || "Xaritada ko'rish"} <ExternalLink size={16} />
        </button>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <MapPin size={20} className="text-brand-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {getJobLocation(selectedJob, language)}
            {selectedJob.distanceKm !== undefined && (
              <span className="ml-2 text-brand-primary">
                ({selectedJob.distanceKm < 1 ? '< 1 km' : `${Math.round(selectedJob.distanceKm)} km`})
              </span>
            )}
          </p>
          {selectedJob.addressDetails && (
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedJob.addressDetails}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Map Preview Box */}
      <div
        onClick={handleMapButtonClick}
        role="button"
        tabIndex={0}
        aria-label={t.openOnMap || "Xaritada ko'rish"}
        className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 relative shadow-xs bg-slate-100 cursor-pointer group hover:border-brand-primary/50 transition-colors"
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Center Marker Pin */}
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 bg-brand-primary/20 rounded-full animate-ping pointer-events-none" />
            <div className="relative w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-white group-hover:scale-105 transition-transform">
              <MapPin size={22} className="stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Click to open badge on bottom right */}
        <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200/80 flex items-center gap-1 group-hover:bg-brand-primary group-hover:text-white transition-colors pointer-events-none">
          <span>{t.openOnMap || "Xaritada ko'rish"}</span>
          <ExternalLink size={12} />
        </div>
      </div>

      {handleCalculateDistance && (
        <div className="mt-3">
          <button
            onClick={handleCalculateDistance}
            disabled={isLocating}
            className="w-full h-11 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            <Navigation size={15} className="rotate-45" />
            {isLocating 
              ? (language === 'uz' ? "Yo'nalish hisoblanmoqda..." : language === 'ru' ? "Прокладывание маршрута..." : "Calculating directions...") 
              : `${t.directions || "Yo'nalish"}`
            }
            {distanceToSelectedJob && ` - ${distanceToSelectedJob}`}
          </button>
        </div>
      )}
    </section>
  );
};
