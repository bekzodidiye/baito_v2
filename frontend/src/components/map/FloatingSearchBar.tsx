import React from 'react';
import { Search, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface FloatingSearchBarProps {
  setShowRegionSelector: (show: boolean) => void;
}

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  setShowRegionSelector,
}) => {
  const { language } = useApp();
  const t = translations[language];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute top-3.5 left-3.5 right-3.5 z-30 max-w-md mx-auto flex items-center gap-2 pointer-events-auto"
    >
      <div 
        onClick={() => setShowRegionSelector(true)}
        className="flex-1 flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-lg border border-slate-200/90 hover:bg-white hover:border-brand-primary/50 transition-all cursor-pointer active:scale-[0.98] select-none h-11"
      >
        <Search className="text-brand-primary shrink-0" size={18} />
        <span className="text-xs text-slate-800 font-bold truncate select-none">
          {t.searchPlaceholder || "Viloyat, shahar yoki tuman..."}
        </span>
        <MapPin className="text-brand-primary ml-auto shrink-0" size={18} />
      </div>
    </div>
  );
};
