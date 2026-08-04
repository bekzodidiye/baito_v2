import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translateRegion } from '../../translations';

interface MapBreadcrumbsProps {
  breadcrumbItems: string[];
  handleBreadcrumbBack: () => void;
}

export const MapBreadcrumbs: React.FC<MapBreadcrumbsProps> = ({
  breadcrumbItems,
  handleBreadcrumbBack,
}) => {
  const { language } = useApp();
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/95 text-slate-800 px-3.5 py-2 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] backdrop-blur-md animate-fade-in max-w-[calc(100%-32px)] overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-none"
    >
      <button 
        onClick={handleBreadcrumbBack}
        className="flex items-center justify-center p-1 text-brand-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
        title="Orqaga"
      >
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
