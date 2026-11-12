import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Navigation, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Job } from '../../types';
import { getLatLng } from '../map/mapUtils';
import { createTileLayers } from '../map/mapTileLayers';
import { getJobLocation } from '../../utils/jobTranslationUtils';

interface JobLocationFullModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  language: 'uz' | 'ru' | 'en';
}

export const JobLocationFullModal: React.FC<JobLocationFullModalProps> = ({
  isOpen,
  onClose,
  job,
  language,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const coords = getLatLng(job);
  const locationTitle = job.addressDetails || getJobLocation(job, language);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize interactive Leaflet map when modal is open
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Use fast cached Google Maps vector road tiles
      createTileLayers('jobs', map);

      // Stylish pulsing custom pin marker
      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
            <div style="position: absolute; width: 48px; height: 48px; background: rgba(30, 58, 138, 0.25); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 42px; height: 42px; background: #1e3a8a; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 20px -4px rgba(0, 0, 0, 0.35); color: white;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div style="position: absolute; bottom: 2px; width: 10px; height: 10px; background: #1e3a8a; transform: rotate(45deg); border-right: 2px solid white; border-bottom: 2px solid white;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customPinIcon }).addTo(map);

      leafletMapRef.current = map;

      // Invalidate size immediately once visible
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);

      return () => {
        clearTimeout(timer);
        map.remove();
        leafletMapRef.current = null;
      };
    } catch {
      // Fallback gracefully
    }
  }, [isOpen, coords.lat, coords.lng]);

  const handleZoomIn = () => leafletMapRef.current?.zoomIn();
  const handleZoomOut = () => leafletMapRef.current?.zoomOut();
  const handleRecenter = () => {
    leafletMapRef.current?.setView([coords.lat, coords.lng], 16, { animate: true });
  };

  const handleExternalNav = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white w-full sm:max-w-4xl h-full sm:h-[85vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 pointer-events-auto border border-slate-200"
          >
            {/* Modal Header */}
            <div className="bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center shrink-0">
                  <MapPin size={20} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {language === 'uz' ? 'Ish joyi xaritasi' : language === 'ru' ? 'Локация работы' : 'Job Location'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {locationTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExternalNav}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Navigation size={14} className="rotate-45" />
                  <span>Google Maps</span>
                  <ExternalLink size={12} />
                </button>
                <button
                  onClick={onClose}
                  aria-label={language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="relative flex-1 w-full h-full bg-slate-100 overflow-hidden">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map Floating Zoom & Recenter Controls */}
              <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                  <button
                    onClick={handleZoomIn}
                    aria-label="Zoom in"
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    aria-label="Zoom out"
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                <button
                  onClick={handleRecenter}
                  title={language === 'uz' ? 'Markazga qaytish' : language === 'ru' ? 'К маркеру' : 'Recenter'}
                  className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-brand-primary transition-colors cursor-pointer"
                >
                  <MapPin size={18} />
                </button>
              </div>

              {/* Bottom Address Info Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-[500]">
                <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                      {language === 'uz' ? 'Aniq manzil' : language === 'ru' ? 'Точный адрес' : 'Exact address'}
                    </p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {locationTitle}
                    </p>
                  </div>

                  <button
                    onClick={handleExternalNav}
                    className="inline-flex sm:hidden items-center justify-center w-10 h-10 rounded-xl bg-brand-primary text-white shrink-0 shadow-md cursor-pointer"
                  >
                    <Navigation size={18} className="rotate-45" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
