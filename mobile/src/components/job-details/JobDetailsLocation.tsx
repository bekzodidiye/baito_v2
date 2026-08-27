import React from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Job } from '../../types';
import { getLatLng } from '../map/mapUtils';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

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
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, setMapFocusedJobId } = useApp();
  const t = translations[language];

  const handleMapButtonClick = () => {
    if (onOpenOnMap) {
      onOpenOnMap();
    } else {
      setMapFocusedJobId(selectedJob.id);
      setCurrentScreen('jobs');
    }
  };

  const coords = getLatLng(selectedJob);
  const bbox = `${coords.lng - 0.012}%2C${coords.lat - 0.008}%2C${coords.lng + 0.012}%2C${coords.lat + 0.008}`;

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
            {selectedJob.location}
            {selectedJob.distanceKm !== undefined && (
              <span className="ml-2 text-brand-primary">
                ({selectedJob.distanceKm < 1 ? '< 1 km' : `${Math.round(selectedJob.distanceKm)} km`})
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'uz' ? "Amir Temur shoh ko'chasi, 120" : language === 'ru' ? "Проспект Амира Темура, 120" : "Amir Temur Avenue, 120"}
          </p>
        </div>
      </div>

      {/* Interactive Map Preview Box */}
      <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 relative shadow-xs bg-slate-100">
        <iframe
          title={`map-preview-${selectedJob.id}`}
          className="w-full h-full border-0 pointer-events-none opacity-90"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
        />
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-brand-primary/20">
            <MapPin size={22} />
          </div>
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
