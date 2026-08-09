import React from 'react';
import { Loader2, ArrowUpDown, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface JobSortHeaderProps {
  language: string;
  t: Record<string, string>;
  getJobsCountSummary: () => string;
  hasActiveJobToday: boolean;
  applicationsTodayCount: number;
  requestLocation: () => void;
  isRequestingLocation: boolean;
  sortBy: 'yangilari' | 'maosh' | 'yaqin' | 'mos';
  setSortBy: (sort: 'yangilari' | 'maosh' | 'yaqin' | 'mos') => void;
  isSortDropdownOpen: boolean;
  setIsSortDropdownOpen: (open: boolean) => void;
}

export const JobSortHeader: React.FC<JobSortHeaderProps> = ({
  language,
  t,
  getJobsCountSummary,
  hasActiveJobToday,
  applicationsTodayCount,
  requestLocation,
  isRequestingLocation,
  sortBy,
  setSortBy,
  isSortDropdownOpen,
  setIsSortDropdownOpen,
}) => {
  return (
    <div className="flex justify-between items-center px-1 py-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] md:text-xs font-semibold text-slate-500">
          {getJobsCountSummary()}
        </span>
        <span
          className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md inline-block w-fit ${
            hasActiveJobToday
              ? 'bg-rose-100 text-rose-600'
              : 'bg-brand-primary/10 text-brand-primary'
          }`}
        >
          {hasActiveJobToday
            ? language === 'ru'
              ? 'Занято'
              : language === 'en'
              ? 'Busy'
              : 'Band (ish bor)'
            : `${
                language === 'ru'
                  ? 'Лимит на сегодня:'
                  : language === 'en'
                  ? "Today's limit:"
                  : 'Bugungi limit:'
              } ${applicationsTodayCount}/2`}
        </span>
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={requestLocation}
          disabled={isRequestingLocation}
          className={`flex items-center gap-1.5 bg-white shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] hover:bg-slate-50 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 border-none ${
            sortBy === 'yaqin' ? 'text-brand-primary' : 'text-slate-600'
          }`}
        >
          {isRequestingLocation ? (
            <Loader2 size={12} className="animate-spin text-brand-primary" />
          ) : (
            <MapPin
              size={12}
              className={sortBy === 'yaqin' ? 'text-brand-primary' : 'text-slate-400'}
            />
          )}
          <span className="hidden sm:inline">
            {language === 'uz' ? 'Yaqinimdagi ishlar' : language === 'ru' ? 'Рядом со мной' : 'Jobs near me'}
          </span>
          <span className="sm:hidden">
            {language === 'uz' ? 'Yaqin' : language === 'ru' ? 'Рядом' : 'Near'}
          </span>
        </button>

        <button
          onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
          className="flex items-center gap-1.5 bg-white text-brand-text-variant shadow-[inset_0_4px_8px_rgba(0,0,0,0.14),_0_0_12px_rgba(0,0,0,0.04)] hover:bg-slate-50 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 border-none"
        >
          <ArrowUpDown
            size={12}
            className={`transition-colors duration-200 ${
              isSortDropdownOpen ? 'text-brand-primary' : 'text-slate-400'
            }`}
          />
          <span>
            {sortBy === 'yangilari'
              ? t.latest
              : sortBy === 'maosh'
              ? t.maxSalary
              : sortBy === 'mos'
              ? t.mostRelevant
              : language === 'uz'
              ? 'Yaqin'
              : language === 'ru'
              ? 'Рядом'
              : 'Near'}
          </span>
        </button>

        <AnimatePresence>
          {isSortDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setIsSortDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-44 bg-white border border-slate-100/80 rounded-2xl shadow-[0_10px_30px_rgba(26,35,126,0.12),_0_4px_12px_rgba(0,0,0,0.04)] z-40 py-1.5 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setSortBy('yangilari');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors border-none bg-transparent ${
                    sortBy === 'yangilari'
                      ? 'text-brand-primary bg-brand-primary/5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{t.latest}</span>
                </button>
                <button
                  onClick={() => {
                    setSortBy('maosh');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors border-none bg-transparent ${
                    sortBy === 'maosh'
                      ? 'text-brand-primary bg-brand-primary/5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{t.maxSalary}</span>
                </button>
                <button
                  onClick={() => {
                    setSortBy('mos');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors border-none bg-transparent ${
                    sortBy === 'mos'
                      ? 'text-brand-primary bg-brand-primary/5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{t.mostRelevant}</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
