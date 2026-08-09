import React, { memo } from 'react';
import { Search, MapPin, Loader2, Tag } from 'lucide-react';
import { REGIONS_LIST, getRegionDisplayName } from './JobSearchScreen.utils';
import { Language } from '../../../translations';
import { CATEGORIES_CONFIG, CATEGORY_FILTERS_LIST } from '../../../utils/jobCategoryUtils';

interface SearchSidebarProps {
  t: any;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  setShowRegionSelector: (val: boolean) => void;
  filterLocation: string;
  setFilterLocation: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  sortBy: 'yangilari' | 'maosh' | 'yaqin' | 'mos';
  setSortBy: (val: 'yangilari' | 'maosh' | 'yaqin' | 'mos') => void;
  clearFilters: () => void;
  language: Language;
  SCHEDULE_FILTERS: Array<{ key: string; label: string }>;
  requestLocation: () => void;
  isRequestingLocation: boolean;
}

const SearchSidebarComponent: React.FC<SearchSidebarProps> = ({
  t, searchTerm, setSearchTerm, setShowRegionSelector, filterLocation, setFilterLocation,
  filterType, setFilterType, filterCategory, setFilterCategory, sortBy, setSortBy,
  clearFilters, language, SCHEDULE_FILTERS, requestLocation, isRequestingLocation
}) => {
  return (
    <aside className="col-span-3 min-w-0 bg-white p-5 lg:p-6 rounded-2xl shadow-xs flex flex-col gap-5 lg:gap-6 sticky top-4 h-[calc(100vh-32px)] overflow-y-auto no-scrollbar">
      <div>
        <h3 className="font-display font-bold text-sm text-brand-primary uppercase tracking-wider mb-3">{t.searchProfession}</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            className="w-full bg-slate-50 hover:bg-slate-100/70 text-xs font-sans rounded-xl py-2.5 pl-9 pr-3 border border-transparent focus:border-brand-primary/30 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-400"
            placeholder={t.keywordPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="h-[1px] bg-slate-100" />

      {/* Categories */}
      <div>
        <h3 className="font-display font-bold text-sm text-brand-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tag size={14} />
          {language === 'uz' ? 'Kategoriya' : language === 'ru' ? 'Категория' : 'Category'}
        </h3>
        <div className="flex flex-col gap-1.5">
          {CATEGORY_FILTERS_LIST.map(cat => {
            const label = language === 'ru' ? cat.labelRu : language === 'en' ? cat.labelEn : cat.labelUz;
            const isSelected = filterCategory === cat.id;
            const catConfig = CATEGORIES_CONFIG[cat.id];
            
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                  isSelected ? 'bg-brand-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {catConfig && <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : catConfig.dotBg}`} />}
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[1px] bg-slate-100" />

      {/* Regions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display font-bold text-sm text-brand-primary uppercase tracking-wider">{t.regions}</h3>
          <button onClick={() => setShowRegionSelector(true)} className="text-[11px] text-brand-primary font-bold hover:underline cursor-pointer">
            {t.otherRegions}
          </button>
        </div>
        <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar border border-slate-50 p-2 rounded-xl bg-slate-50/50">
          {REGIONS_LIST.map(loc => (
            <button
              key={loc}
              onClick={() => setFilterLocation(loc)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                filterLocation === loc ? 'bg-brand-primary text-white shadow-xs' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <span className="truncate">{getRegionDisplayName(loc, language)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-slate-100" />

      {/* Job Schedule */}
      <div>
        <h3 className="font-display font-bold text-sm text-brand-primary uppercase tracking-wider mb-3">{t.jobSchedule}</h3>
        <div className="flex flex-col gap-1.5">
          {SCHEDULE_FILTERS.map(type => (
            <button
              key={type.key}
              onClick={() => setFilterType(type.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                filterType === type.key ? 'bg-brand-primary text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-slate-100" />

      {/* Sort */}
      <div>
        <h3 className="font-display font-bold text-sm text-brand-primary uppercase tracking-wider mb-3">{t.sortBy}</h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={() => setSortBy('yangilari')} className={`flex-1 text-center py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${sortBy === 'yangilari' ? 'bg-brand-primary text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {t.latest}
            </button>
            <button onClick={() => setSortBy('maosh')} className={`flex-1 text-center py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${sortBy === 'maosh' ? 'bg-brand-primary text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {t.maxSalary}
            </button>
          </div>
          <button onClick={() => setSortBy('mos')} className={`w-full text-center py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${sortBy === 'mos' ? 'bg-brand-primary text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            {t.mostRelevant}
          </button>
          <button onClick={requestLocation} disabled={isRequestingLocation} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${sortBy === 'yaqin' ? 'bg-brand-primary/10 text-brand-primary shadow-xs border border-brand-primary/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'}`}>
            {isRequestingLocation ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            {language === 'uz' ? 'Yaqinimdagi ishlar' : language === 'ru' ? 'Рядом со мной' : "Jobs near me"}
          </button>
        </div>
      </div>

      {(searchTerm || filterLocation !== 'Barchasi' || filterType !== 'Barchasi' || filterCategory !== 'Barchasi') && (
        <>
          <div className="h-[1px] bg-slate-100" />
          <button onClick={clearFilters} className="w-full text-center py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer">
            {t.clearFilters}
          </button>
        </>
      )}
    </aside>
  );
};

export const SearchSidebar = memo(SearchSidebarComponent);
