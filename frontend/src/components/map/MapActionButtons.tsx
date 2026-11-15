import React from 'react';
import { RefreshCw, Compass, Plus, Minus, LayoutList } from 'lucide-react';
import { translations } from '../../translations';
import { MapTypeSelector } from './MapTypeSelector';
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";

interface MapActionButtonsProps {
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleResetMap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  mapType?: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';
  setMapType?: (type: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro') => void;
  isPanelExpanded?: boolean;
}

export const MapActionButtons: React.FC<MapActionButtonsProps> = ({
  isRefreshing,
  handleRefresh,
  handleResetMap,
  onZoomIn,
  onZoomOut,
  mapType,
  setMapType,
  isPanelExpanded = false,
}) => {
  const language = useAuthStore(s => s.language);
  const setJobsView = useUIStore(s => s.setJobsView);
  const t = translations[language];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="pointer-events-none z-10"
    >
      {/* Left Bottom: Update/Refresh Button */}
      <div 
        className={`absolute pointer-events-auto transition-all duration-300 ease-in-out left-4 md:left-6 ${
          isPanelExpanded 
            ? 'bottom-[252px] md:bottom-6' 
            : 'bottom-[72px] md:bottom-6'
        }`}
      >
        <button
          onClick={handleRefresh}
          className="bg-brand-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(79,70,229,0.25)] flex items-center gap-2 active:translate-y-[2px] active:shadow-[0_2px_6px_rgba(79,70,229,0.2)] transition-all duration-150 hover:bg-brand-primary-container cursor-pointer border-none"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? t.refreshing : t.refresh}</span>
        </button>
      </div>

      {/* Right Bottom: Control Stack (MapTypeSelector + Zoom Controls + List + Compass) */}
      <div 
        className={`absolute pointer-events-auto transition-all duration-300 ease-in-out flex flex-col gap-2 items-center right-4 md:bottom-6 ${
          isPanelExpanded
            ? 'bottom-[252px] md:right-[404px] lg:right-[444px]'
            : 'bottom-[72px] md:right-6'
        }`}
      >
        {/* Layer Type Switcher */}
        {mapType && setMapType && (
          <MapTypeSelector mapType={mapType} setMapType={setMapType} />
        )}

        {/* Zoom Controls Pill (matching the 44px / w-11 width of location button) */}
        <div className="bg-white rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100/95 flex flex-col p-1 w-11 items-center gap-1">
          <button
            onClick={onZoomIn}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-brand-primary active:scale-90 transition-all duration-150 cursor-pointer border-none"
            title={t.zoomIn}
            aria-label={t.zoomIn}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
          <div className="h-[1px] bg-slate-100 w-6 my-0.5" />
          <button
            onClick={onZoomOut}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-brand-primary active:scale-90 transition-all duration-150 cursor-pointer border-none"
            title={t.zoomOut}
            aria-label={t.zoomOut}
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Switch to the list. The header carries the same toggle, but it is
            mobile-only, so on a desktop the list had no way in at all. */}
        <button
          onClick={() => setJobsView('list')}
          className="bg-white text-brand-primary w-11 h-11 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:translate-y-[2px] active:shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-150 hover:bg-slate-50 cursor-pointer border-none"
          title={t.listView}
          aria-label={t.listView}
        >
          <LayoutList size={18} className="text-brand-primary" />
        </button>

        {/* Current Location / Reset FAB */}
        <button
          onClick={handleResetMap}
          className="bg-white text-brand-primary w-11 h-11 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center active:translate-y-[2px] active:shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-150 hover:bg-slate-50 cursor-pointer border-none"
          title={t.showAll}
          aria-label={t.showAll}
        >
          <Compass size={18} className="text-brand-primary" />
        </button>
      </div>
    </div>
  );
};

