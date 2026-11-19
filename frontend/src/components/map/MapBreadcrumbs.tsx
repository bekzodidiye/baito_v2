import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { translateRegion } from '../../translations';
import { useAuthStore } from "../../store/useAuthStore";
import { useUIStore } from "../../store/useUIStore";

interface MapBreadcrumbsProps {
  breadcrumbItems: string[];
  handleBreadcrumbBack: () => void;
}

export const MapBreadcrumbs: React.FC<MapBreadcrumbsProps> = ({
  breadcrumbItems,
  handleBreadcrumbBack,
}) => {
  const language = useAuthStore(s => s.language);
  const desktopSidebarCollapsed = useUIStore(s => s.desktopSidebarCollapsed);
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`absolute top-3.5 left-3.5 z-30 flex items-center gap-2 bg-white/95 text-slate-800 px-3.5 rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.10)] backdrop-blur-md animate-fade-in max-w-[calc(100%-32px)] overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border border-slate-200/90 transition-all duration-300 ease-in-out h-11 ${
        desktopSidebarCollapsed ? 'md:left-[80px]' : 'md:left-6'
      }`}
    >
      <button 
        onClick={handleBreadcrumbBack}
        className="flex items-center justify-center p-1 text-brand-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
        title={language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Orqaga'}
       aria-label={language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Orqaga'}>
<ArrowLeft size={16} className="stroke-[2.5px]" />
      </button>
      {breadcrumbItems.map((item, index) => {
        const isUzbekistan = item === "O'zbekiston";
        const isLast = index === breadcrumbItems.length - 1;
        const isMiddle = index === 1 && breadcrumbItems.length === 3;
        const displayItem = translateRegion(item, language);
        return (
          <React.Fragment key={index}>
            <span className={`text-slate-300 text-xs font-semibold shrink-0 ${isUzbekistan ? 'hidden md:inline' : ''}`}>/</span>
            <span 
              className={`text-xs ${
                isLast 
                  ? 'text-slate-800 font-extrabold max-w-[130px] xs:max-w-[180px] md:max-w-none' 
                  : isMiddle
                    ? 'text-slate-500 font-semibold hover:text-brand-primary max-w-[70px] xs:max-w-[100px] md:max-w-none'
                    : 'text-slate-500 font-semibold hover:text-brand-primary max-w-[100px] md:max-w-none'
              } truncate inline-block align-middle transition-colors ${isUzbekistan ? 'hidden md:inline' : ''}`}
              title={displayItem}
            >
              {displayItem}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
