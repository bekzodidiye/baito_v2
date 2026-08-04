import React, { useState, useRef, useEffect, memo } from 'react';
import { Search, SlidersHorizontal, MapPin, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { translations, translateRegion } from '../../translations';
import { CATEGORIES_CONFIG, CATEGORY_FILTERS_LIST } from '../../utils/jobCategoryUtils';
import { REGIONS_LIST } from './JobSearchScreen.utils';

interface SearchFilterSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  setShowRegionSelector: (show: boolean) => void;
}

const SearchFilterSectionComponent: React.FC<SearchFilterSectionProps> = ({
  searchTerm, setSearchTerm, filterLocation, setFilterLocation,
  filterType, setFilterType, filterCategory, setFilterCategory, setShowRegionSelector
}) => {
  const { language } = useApp();
  const t = translations[language];

  const [showFilters, setShowFilters] = useState(false);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [showLeftBlur, setShowLeftBlur] = useState(false);
  const [showRightBlur, setShowRightBlur] = useState(true);

  const activeFiltersCount = (filterType !== 'Barchasi' ? 1 : 0) + (filterCategory !== 'Barchasi' ? 1 : 0);
  const regionList = Array.from(new Set([...REGIONS_LIST, filterLocation]));

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftBlur(container.scrollLeft > 10);
      setShowRightBlur(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      const observer = new ResizeObserver(() => handleScroll());
      observer.observe(container);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      if (filterLocation === 'Barchasi') {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (activeRef.current) {
        const scrollPosition = activeRef.current.offsetLeft - (container.clientWidth / 2) + (activeRef.current.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
      }
    }
  }, [filterLocation]);

  return (
    <section className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-outline" size={20} />
        <input
          type="text"
          className="w-full bg-white text-brand-text font-sans rounded-full py-3 pl-12 pr-4 shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] border-0 focus:bg-white focus:outline-none transition-all placeholder:text-brand-outline text-sm"
          placeholder={t.keywordPlaceholder || "Kasb, kompaniya yoki kalit so'z..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="relative w-full">
        <div className={`absolute left-0 top-0 bottom-1 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity ${showLeftBlur ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity ${showRightBlur ? 'opacity-100' : 'opacity-0'}`} />

        <div ref={scrollContainerRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 w-full flex-nowrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-semibold cursor-pointer shrink-0 border-0 outline-none ${
              showFilters || activeFiltersCount > 0 ? 'bg-brand-primary text-white shadow-xs' : 'bg-white text-brand-text-variant shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>{t.filters || "Filtrlar"}</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {regionList.map(loc => (
            <button
              key={loc}
              ref={filterLocation === loc ? activeRef : null}
              onClick={() => setFilterLocation(loc)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border-0 outline-none ${
                filterLocation === loc ? 'bg-brand-primary text-white shadow-xs' : 'bg-white text-brand-text-variant shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] hover:bg-slate-50'
              }`}
            >
              {loc === 'Barchasi' ? (t.allRegions || 'Barcha hududlar') : translateRegion(loc, language)}
            </button>
          ))}

          <button
            onClick={() => setShowRegionSelector(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-brand-text-variant shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] hover:bg-slate-50 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border-0 outline-none"
          >
            <MapPin size={12} className="text-brand-primary" />
            <span>{t.otherRegions || "Boshqa..."}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 pt-3 flex flex-col gap-3.5"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1">
                <Tag size={12} />
                {language === 'uz' ? 'Kategoriya' : language === 'ru' ? 'Категория' : 'Category'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_FILTERS_LIST.map(cat => {
                  const label = language === 'ru' ? cat.labelRu : language === 'en' ? cat.labelEn : cat.labelUz;
                  const isSelected = filterCategory === cat.id;
                  const catConfig = CATEGORIES_CONFIG[cat.id];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {catConfig && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : catConfig.dotBg}`} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">{t.jobSchedule || "Ish grafigi"}</p>
              <div className="flex flex-wrap gap-1.5">
                {["Barchasi", "To'liq bandlik", "Smenali grafik", "Erkin grafik"].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      filterType === type ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {type === 'Barchasi' ? (t.allJobs || 'Barchasi') : type === "To'liq bandlik" ? (t.fullTime || "To'liq bandlik") : type === "Smenali grafik" ? (t.shiftSchedule || "Smenali grafik") : (t.freeSchedule || "Erkin grafik")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => { setFilterLocation('Barchasi'); setFilterType('Barchasi'); setFilterCategory('Barchasi'); setSearchTerm(''); }}
                className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
              >
                {t.clearFilters || "Filtrlarni tozalash"}
              </button>
              <button onClick={() => setShowFilters(false)} className="bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">
                {t.done || "Tayyor"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export const SearchFilterSection = memo(SearchFilterSectionComponent);
