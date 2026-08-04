import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { translateRegion } from '../translations';
import { useRegionSelector } from '../hooks/useRegionSelector';
import { RegionSelectorList } from './RegionSelectorList';

interface RegionSelectorProps {
  embedded?: boolean;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({ embedded = false }) => {
  const {
    showRegionSelector,
    language,
    searchText,
    setSearchText,
    selectedRegion,
    setSelectedRegion,
    filteredRegions,
    filteredDistricts,
    searchResults,
    getRegionCountText,
    handleItemClick,
    handleBackClick,
    closeSelector
  } = useRegionSelector();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showRegionSelector) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showRegionSelector]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRegionSelector) {
        closeSelector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRegionSelector, closeSelector]);

  if (!showRegionSelector) return null;

  const containerClasses = embedded
    ? "absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200 rounded-2xl overflow-hidden"
    : "fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200";

  return (
    <div 
      id={embedded ? "region-selector-embedded" : "region-selector-modal"} 
      className={containerClasses}
      onClick={closeSelector}
    >
      <div 
        className="bg-white text-brand-text rounded-2xl w-full max-w-[400px] max-h-[85%] sm:max-h-[80%] flex flex-col shadow-2xl overflow-hidden border border-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 flex justify-between items-center px-3.5 py-2.5 shrink-0">
          <button 
            onClick={handleBackClick}
            className="text-brand-text-variant hover:bg-brand-surface-low p-1.5 rounded-full flex items-center justify-center cursor-pointer outline-none transition-colors"
            title={language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Orqaga'}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 text-center mx-2 truncate">
            <h1 className="font-display text-xs sm:text-sm font-bold text-brand-primary truncate">
              {selectedRegion 
                ? translateRegion(selectedRegion.name, language) 
                : (language === 'ru' ? "Выберите регион" : language === 'en' ? "Select Region" : "Hududni tanlang")}
            </h1>
          </div>
          <button 
            onClick={closeSelector}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            title={language === 'ru' ? 'Закрыть' : language === 'en' ? 'Close' : 'Yopish'}
          >
            <X size={18} />
          </button>
        </header>

        <main className="flex-1 px-3.5 py-3 overflow-y-auto w-full">
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-outline">
              <Search size={16} />
            </div>
            <input 
              ref={inputRef}
              className="block w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:bg-white text-xs font-sans text-brand-text placeholder:text-brand-outline transition-all focus:ring-2 focus:ring-brand-primary/20" 
              placeholder={selectedRegion 
                ? (language === 'ru' ? "Поиск района..." : language === 'en' ? "Search district..." : "Tumanni qidirish...")
                : (language === 'ru' ? "Название области или района..." : language === 'en' ? "Region or district name..." : "Viloyat yoki tuman nomi...")
              } 
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button 
                onClick={() => setSearchText('')} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-outline hover:text-brand-text cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <RegionSelectorList
            language={language}
            searchText={searchText}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            filteredRegions={filteredRegions}
            filteredDistricts={filteredDistricts}
            searchResults={searchResults}
            getRegionCountText={getRegionCountText}
            handleItemClick={handleItemClick}
          />
        </main>
      </div>
    </div>
  );
};
