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
import { createTileLayers } from '../map/mapTileLayers';
import { JobLocationFullModal } from './JobLocationFullModal';

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

  const [isFullMapOpen, setIsFullMapOpen] = React.useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const handleMapButtonClick = () => {
    if (onOpenOnMap) {
      onOpenOnMap();
    } else {
      setIsFullMapOpen(true);
    }
  };

  const coords = getLatLng(selectedJob);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([coords.lat, coords.lng], 16);
      return;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      // Use fast cached Google Maps vector road tiles for instant rendering
      const { baseLayer, labelLayer } = createTileLayers('jobs', map);
      baseLayer.addTo(map);
      if (labelLayer) {
        labelLayer.addTo(map);
      }

      // Custom pulsing map pin on the exact coordinate
      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
            <div style="position: absolute; width: 40px; height: 40px; background: rgba(30, 58, 138, 0.25); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 36px; height: 36px; background: #1e3a8a; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2); color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div style="position: absolute; bottom: 2px; width: 8px; height: 8px; background: #1e3a8a; transform: rotate(45deg); border-right: 2px solid white; border-bottom: 2px solid white;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([coords.lat, coords.lng], { icon: customPinIcon }).addTo(map);

      leafletMapRef.current = map;

      // Invalidate size fast
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 50);

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
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-primary flex items-center justify-center font-bold">
            <MapPin size={16} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t.address || "Manzil"}
          </h3>
        </div>
        <button
          onClick={handleMapButtonClick}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-brand-primary text-brand-primary hover:text-white text-xs sm:text-sm font-bold border border-blue-200/60 transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
        >
          <span>{t.openOnMap || "Xaritada ochish"}</span>
          <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex items-start gap-3 mb-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <MapPin size={18} className="text-brand-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 leading-snug">
            {getJobLocation(selectedJob, language)}
            {selectedJob.distanceKm !== undefined && (
              <span className="ml-2 font-semibold text-brand-primary">
                ({selectedJob.distanceKm < 1 ? '< 1 km' : `${Math.round(selectedJob.distanceKm)} km`})
              </span>
            )}
          </p>
          {selectedJob.addressDetails && (
            <p className="text-xs text-slate-500 font-medium mt-0.5 break-words">
              {selectedJob.addressDetails}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Map Preview Box - Enlarged Height */}
      <div
        onClick={handleMapButtonClick}
        role="button"
        tabIndex={0}
        aria-label={t.openOnMap || "Xaritada ochish"}
        className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200/90 relative shadow-sm bg-slate-100 cursor-pointer group hover:border-brand-primary hover:shadow-md transition-all"
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Location Overlay Chip */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-md border border-slate-200/80 flex items-center gap-2 pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{selectedJob.addressDetails || getJobLocation(selectedJob, language)}</span>
        </div>

        {/* Click to open badge on bottom right */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-brand-primary shadow-md border border-blue-100 flex items-center gap-1.5 group-hover:bg-brand-primary group-hover:text-white transition-all pointer-events-none">
          <span>{t.openOnMap || "Xaritada ochish"}</span>
          <ExternalLink size={13} />
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

      {/* Interactive Full Map Modal on Click */}
      <JobLocationFullModal
        isOpen={isFullMapOpen}
        onClose={() => setIsFullMapOpen(false)}
        job={selectedJob}
        language={language}
      />
    </section>
  );
};
