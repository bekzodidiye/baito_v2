import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import { translateRegion, Language } from '../translations';
import { RegionListItem } from './map/regionData';

interface RegionSelectorListProps {
  language: Language;
  searchText: string;
  selectedRegion: RegionListItem | null;
  setSelectedRegion: (region: RegionListItem | null) => void;
  filteredRegions: RegionListItem[];
  filteredDistricts: string[];
  searchResults: { isRegion: boolean; name: string; subtitle?: string; value: string }[];
  getRegionCountText: (countStr: string, lang: Language) => string;
  handleItemClick: (locationName: string) => void;
}

export const RegionSelectorList: React.FC<RegionSelectorListProps> = ({
  language,
  searchText,
  selectedRegion,
  setSelectedRegion,
  filteredRegions,
  filteredDistricts,
  searchResults,
  getRegionCountText,
  handleItemClick,
}) => {
  if (!selectedRegion && searchText) {
    if (searchResults.length === 0) {
      return (
        <div className="text-center py-6 text-brand-text-variant text-xs font-semibold">
          {language === 'ru' ? "Регионы не найдены" : language === 'en' ? "No regions found" : "Hech qanday hudud topilmadi"}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-1.5 pb-2">
        {searchResults.map((match, idx) => {
          const isRegionMatched = match.isRegion;
          let subtitleTranslated = match.subtitle || "";
          if (match.subtitle === "Viloyat") {
            subtitleTranslated = language === 'ru' ? "Область" : language === 'en' ? "Region" : "Viloyat";
          } else if (match.subtitle === "Toshkent viloyati tarkibida (Poytaxt)") {
            subtitleTranslated = language === 'ru' ? "В составе Ташкентской области (Столица)" : language === 'en' ? "Within Tashkent Region (Capital)" : "Toshkent viloyati tarkibida (Poytaxt)";
          } else if (match.subtitle) {
            subtitleTranslated = translateRegion(match.subtitle, language);
          }

          return (
            <button 
              key={idx}
              onClick={() => handleItemClick(match.value)}
              className="w-full bg-slate-50 hover:bg-brand-primary/5 border border-slate-100 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
            >
              <div className={`p-1.5 rounded-full mr-2.5 flex items-center justify-center shrink-0 ${
                isRegionMatched ? 'bg-brand-primary text-white shadow-2xs' : 'bg-brand-surface-low text-brand-text-variant'
              }`}>
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-xs text-brand-text truncate">{translateRegion(match.name, language)}</h3>
                {subtitleTranslated && <p className="text-[10px] text-brand-text-variant mt-0.5 font-medium truncate">{subtitleTranslated}</p>}
              </div>
              <ChevronRight size={14} className="text-brand-outline-variant group-hover:text-brand-primary transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    );
  }

  if (selectedRegion) {
    return (
      <div className="grid grid-cols-1 gap-1.5 pb-2">
        <button 
          onClick={() => handleItemClick(selectedRegion.name)}
          className="w-full bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
        >
          <div className="p-1.5 rounded-full mr-2.5 bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
            <MapPin size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-xs text-brand-primary truncate">
              {language === 'ru' ? "Все районы" : language === 'en' ? "All districts" : "Barcha tumanlar"} ({translateRegion(selectedRegion.name, language).replace(" область", "").replace(" region", "").replace(" Республика", "").replace(" Republic", "")})
            </h3>
            <p className="text-[10px] text-brand-primary/80 mt-0.5 font-medium truncate">
              {language === 'ru' ? "Поиск по всей области" : language === 'en' ? "Search across the whole region" : "Butun viloyat bo'ylab qidirish"}
            </p>
          </div>
          <ChevronRight size={14} className="text-brand-primary shrink-0" />
        </button>

        {selectedRegion.isTashkentViloyat && (
          <button 
            onClick={() => setSelectedRegion({ id: "Toshkent_shahri", name: "Toshkent shahri", count: "Poytaxt, 4,500+ bo'sh ish o'rni", isTashkentCity: true })}
            className="w-full bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
          >
            <div className="p-1.5 rounded-full mr-2.5 bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
              <MapPin size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-xs text-brand-primary truncate">{translateRegion("Toshkent shahri", language)}</h3>
              <p className="text-[10px] text-brand-primary/80 mt-0.5 font-medium truncate">
                {language === 'ru' ? "Столица, 4,500+ вакансий" : language === 'en' ? "Capital, 4,500+ vacancies" : "Poytaxt, 4,500+ bo'sh ish o'rni"}
              </p>
            </div>
            <ChevronRight size={14} className="text-brand-primary shrink-0" />
          </button>
        )}

        {filteredDistricts.length > 0 ? (
          filteredDistricts.map((districtName, idx) => (
            <button 
              key={idx}
              onClick={() => handleItemClick(districtName)}
              className="w-full bg-slate-50 hover:bg-brand-primary/5 border border-slate-100 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
            >
              <div className="p-1.5 rounded-full mr-2.5 bg-white text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-xs text-brand-text truncate">{translateRegion(districtName, language)}</h3>
                <p className="text-[10px] text-brand-text-variant mt-0.5 font-medium truncate">
                  {language === 'ru' ? "Посмотреть вакансии" : language === 'en' ? "View vacant jobs" : "Bo'sh ish o'rinlarini ko'rish"}
                </p>
              </div>
              <ChevronRight size={14} className="text-brand-outline-variant group-hover:text-brand-primary transition-colors shrink-0" />
            </button>
          ))
        ) : (
          <div className="text-center py-6 text-brand-text-variant text-xs font-semibold">
            {language === 'ru' ? "Районы не найдены" : language === 'en' ? "No districts found" : "Hech qanday tuman topilmadi"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 pb-2">
      <button 
        onClick={() => handleItemClick("Barchasi")}
        className="w-full bg-brand-primary/5 hover:bg-brand-primary/10 border border-brand-primary/20 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
      >
        <div className="p-1.5 rounded-full mr-2.5 bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
          <MapPin size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xs text-brand-primary truncate">
            {language === 'ru' ? "По всему Узбекистану" : language === 'en' ? "Across Uzbekistan" : "O'zbekiston bo'ylab"}
          </h3>
          <p className="text-[10px] text-brand-primary/80 mt-0.5 font-medium truncate">
            {language === 'ru' ? "Все доступные вакансии" : language === 'en' ? "All available job vacancies" : "Barcha bo'sh ish o'rinlari"}
          </p>
        </div>
        <ChevronRight size={14} className="text-brand-primary shrink-0" />
      </button>

      {filteredRegions.map((region) => (
        <button 
          key={region.id}
          onClick={() => setSelectedRegion(region)}
          className="w-full bg-slate-50 hover:bg-brand-primary/5 border border-slate-100 p-2.5 rounded-xl transition-all flex items-center group text-left cursor-pointer active:scale-99"
        >
          <div className="p-1.5 rounded-full mr-2.5 bg-white text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
            <MapPin size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-xs text-brand-text truncate">{translateRegion(region.name, language)}</h3>
            {region.count && <p className="text-[10px] text-brand-text-variant mt-0.5 font-medium truncate">{getRegionCountText(region.count, language)}</p>}
          </div>
          <ChevronRight size={14} className="text-brand-outline-variant group-hover:text-brand-primary transition-colors shrink-0" />
        </button>
      ))}
    </div>
  );
};
