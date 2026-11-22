import React from 'react';
import { LANDING_TEXTS } from './LandingData';
import { Compass } from 'lucide-react';
import { MapViewScreen } from '../map/MapViewScreen';
import { useAuthStore } from "../../store/useAuthStore";

interface LandingInteractiveMapPreviewProps {
  onSelectRole?: (role: 'worker' | 'employer') => void;
}

export const LandingInteractiveMapPreview: React.FC<LandingInteractiveMapPreviewProps> = () => {
  const language = useAuthStore(s => s.language);
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  return (
    <section id="map-preview" data-allow-guest="true" className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 font-sans relative overflow-hidden border-b border-slate-200/80">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/2 left-0 w-[450px] h-[450px] bg-sky-100/50 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-10 px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-primary text-xs font-black shadow-2xs">
            <Compass size={14} className="text-brand-primary" />
            <span>{t.mapBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{t.mapTitle}</h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600">{t.mapSubtitle}</p>
        </div>

        {/* Full-width Large Map Card */}
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-2.5 sm:p-4 shadow-xl">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative h-[520px] sm:h-[600px] lg:h-[650px] w-full">
            <MapViewScreen preview className="h-full w-full rounded-xl sm:rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
