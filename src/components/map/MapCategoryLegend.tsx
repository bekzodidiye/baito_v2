import React, { useState } from 'react';
import { CATEGORIES_CONFIG } from '../../utils/jobCategoryUtils';
import { Language } from '../../translations';
import { Layers } from 'lucide-react';

interface MapCategoryLegendProps {
  language: Language;
}

export const MapCategoryLegend: React.FC<MapCategoryLegendProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = Object.values(CATEGORIES_CONFIG);

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="relative pointer-events-auto"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 hover:border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-brand-primary transition-colors duration-200 active:scale-95 cursor-pointer"
        title={language === 'ru' ? 'Категории' : language === 'en' ? 'Categories' : 'Kategoriyalar'}
        aria-label="Kategoriyalar"
      >
        <Layers size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-13 bottom-0 w-48 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-100 flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
              {language === 'ru' ? 'Категории' : language === 'en' ? 'Categories' : 'Kategoriyalar'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {categories.map((cat) => {
              const name = language === 'ru' ? cat.nameRu : language === 'en' ? cat.nameEn : cat.nameUz;
              return (
                <div key={cat.id} className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: cat.hexColor }}
                  />
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
