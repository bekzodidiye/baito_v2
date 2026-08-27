import React from 'react';
import { RefreshCw, Compass, Plus, Minus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { MapTypeSelector } from './MapTypeSelector';

interface MapActionButtonsProps {
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleResetMap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  mapType?: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';
  setMapType?: (type: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro') => void;
}

export const MapActionButtons: React.FC<MapActionButtonsProps> = ({
  isRefreshing,
  handleRefresh,
  handleResetMap,
  onZoomIn,
  onZoomOut,
  mapType,
  setMapType,
}) => {
  const { language } = useApp();
  const t = translations[language];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute bottom-full left-0 right-0 px-4 pb-[8px] flex justify-between items-end z-10 pointer-events-none"
    >
      {/* Update/Refresh Button */}
      <button
        onClick={handleRefresh}
        className="pointer-events-auto bg-brand-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(79,70,229,0.25)] flex items-center gap-2 active:translate-y-[2px] active:shadow-[0_2px_6px_rgba(79,70,229,0.2)] transition-all duration-150 hover:bg-brand-primary-container cursor-pointer border-none"
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        <span>{isRefreshing ? t.refreshing : t.refresh}</span>
      </button>

      {/* Right Side Control Stack: MapTypeSelector + Zoom Controls + Location Button */}
      <div className="flex flex-col gap-2 items-center">
        {/* Layer Type Switcher */}
        {mapType && setMapType && (
          <MapTypeSelector mapType={mapType} setMapType={setMapType} />
        )}

        {/* Zoom Controls Pill (matching the 44px / w-11 width of location button) */}
        <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100/95 flex flex-col p-1 w-11 items-center gap-1">
          <button
            onClick={onZoomIn}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-brand-primary active:scale-90 transition-all duration-150 cursor-pointer border-none"
            title={t.zoomIn}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
          <div className="h-[1px] bg-slate-100 w-6 my-0.5" />
          <button
            onClick={onZoomOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-brand-primary active:scale-90 transition-all duration-150 cursor-pointer border-none"
            title={t.zoomOut}
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Current Location / Reset FAB */}
        <button
          onClick={handleResetMap}
          className="pointer-events-auto bg-white text-brand-primary w-11 h-11 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:translate-y-[2px] active:shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-150 hover:bg-slate-50 cursor-pointer border-none"
          title={t.showAll}
        >
          <Compass size={18} className="text-brand-primary" />
        </button>
      </div>
    </div>
  );
};

