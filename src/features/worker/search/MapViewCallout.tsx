import React from 'react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface MapViewCalloutProps {
  setCurrentScreen: (screen: any) => void;
}

export const MapViewCallout: React.FC<MapViewCalloutProps> = ({ setCurrentScreen }) => {
  return (
    <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row items-center relative mt-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(26,35,126,0.07),_0_4px_10px_rgba(26,35,126,0.03)] hover:border-brand-primary/10 transition-all duration-300">
      <div className="p-6 md:w-1/2 flex flex-col gap-3 z-10">
        <h3 className="font-display text-lg font-bold text-brand-primary">O'zingizga yaqin ishlarni xaritadan izlang</h3>
        <p className="text-xs text-brand-text-variant leading-relaxed">
          Lokatsiya bo'yicha qidiruv orqali uyingizga eng yaqin ish joylarini toping va yo'lga ketadigan vaqtni tejang.
        </p>
        <button
          onClick={() => setCurrentScreen('xarita')}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs py-2.5 px-6 rounded-xl w-fit transition-all mt-2 cursor-pointer shadow-sm active:scale-95 duration-200"
        >
          Xaritani ochish
        </button>
      </div>
      <div className="md:w-1/2 h-40 md:h-full w-full relative overflow-hidden flex items-center justify-center">
        {/* Styled Map Illustration */}
        <div className="absolute inset-0 bg-sky-50 opacity-90" />
        <svg viewBox="0 0 400 200" className="w-full h-full object-cover relative z-0 opacity-80">
          <path d="M 0 50 Q 150 150 400 30" fill="none" stroke="#cbd5e1" strokeWidth="12" />
          <path d="M 50 0 Q 200 200 350 200" fill="none" stroke="#cbd5e1" strokeWidth="10" />
          <path d="M 0 150 C 100 80 300 120 400 180" fill="none" stroke="#cbd5e1" strokeWidth="8" />
          <circle cx="120" cy="90" r="14" fill="var(--color-brand-primary)" fillOpacity="0.2" />
          <circle cx="120" cy="90" r="6" fill="var(--color-brand-primary)" />
          <circle cx="280" cy="60" r="16" fill="var(--color-brand-primary)" fillOpacity="0.2" />
          <circle cx="280" cy="60" r="7" fill="var(--color-brand-primary)" />
          <circle cx="180" cy="140" r="12" fill="var(--color-brand-primary)" fillOpacity="0.2" />
          <circle cx="180" cy="140" r="5" fill="var(--color-brand-primary)" />
        </svg>
        <div className="absolute inset-0 bg-linear-to-r from-white/100 via-white/40 to-transparent pointer-events-none md:block hidden" />
      </div>
    </div>
  );
};
