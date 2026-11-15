import React, { useState, useMemo } from 'react';
import { Briefcase, ChevronRight, ChevronLeft, LayoutList, LayoutGrid, Sparkles, TrendingUp, Clock, DollarSign, Search, X } from 'lucide-react';
import { Job } from '../../types';
import { JobCardSkeleton } from './JobCardSkeleton';
import { useJobsData } from "../../context/useJobsData";
import { translations, translateRegion } from '../../translations';
import { JobCardItem } from './JobCardItem';
import { useAuthStore } from "../../store/useAuthStore";
import { getJobTitle, getJobLocation } from '../../utils/jobTranslationUtils';

interface JobSummaryCardProps {
  isPanelExpanded: boolean;
  setIsPanelExpanded: (expanded: boolean) => void;
  activeCluster?: 'all' | 'cluster1' | 'cluster2';
  displayedJobs: Job[];
  selectedJob: Job | null;
  handleJobSelect: (job: Job) => void;
  toggleBookmark?: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  filterLocation: string;
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleResetMap: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  mapType?: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';
  setMapType?: (type: 'jobs' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro') => void;
}

type SortOption = 'all' | 'high_salary' | 'newest' | 'urgent';

export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({
  isPanelExpanded,
  setIsPanelExpanded,
  displayedJobs,
  selectedJob,
  handleJobSelect,
  userLocation,
  filterLocation,
  isRefreshing,
  handleResetMap,
}) => {
  const language = useAuthStore(s => s.language);
  const { jobs, applyToJob } = useJobsData();
  const t = translations[language];
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [activeSort, setActiveSort] = useState<SortOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setIsAtBeginning] = useState(true);

  const appliedJobIds = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (j.applied) set.add(j.id);
    }
    return set;
  }, [jobs]);

  const sortedJobs = useMemo(() => {
    if (!displayedJobs || displayedJobs.length === 0) return [];
    let list = [...displayedJobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(j => {
        const rawTitle = (j.title || '').toLowerCase();
        const locTitle = getJobTitle(j, language).toLowerCase();
        const comp = (j.company || '').toLowerCase();
        const rawLoc = (j.location || '').toLowerCase();
        const locLoc = getJobLocation(j, language).toLowerCase();
        return rawTitle.includes(q) || locTitle.includes(q) || comp.includes(q) || rawLoc.includes(q) || locLoc.includes(q);
      });
    }

    if (activeSort === 'high_salary') {
      return list.sort((a, b) => {
        const salA = typeof a.salary === 'number' ? a.salary : parseInt(String(a.salary).replace(/\D/g, '')) || 0;
        const salB = typeof b.salary === 'number' ? b.salary : parseInt(String(b.salary).replace(/\D/g, '')) || 0;
        return salB - salA;
      });
    }
    if (activeSort === 'newest') {
      return list.sort((a, b) => {
        const dateA = new Date((a as any).createdAt || a.workDate || 0).getTime();
        const dateB = new Date((b as any).createdAt || b.workDate || 0).getTime();
        return dateB - dateA;
      });
    }
    if (activeSort === 'urgent') {
      return list.sort((a, b) => {
        const urgA = (a as any).urgent ? 1 : 0;
        const urgB = (b as any).urgent ? 1 : 0;
        return urgB - urgA;
      });
    }
    return list;
  }, [displayedJobs, activeSort, searchQuery]);

  const getJobsSummaryText = () => {
    const count = displayedJobs.length;
    if (filterLocation === 'Barchasi') {
      return count === 0 ? t.noJobsUzbekistan : t.jobsFoundUzbekistan.replace('{count}', count.toString());
    } else {
      const locName = translateRegion(filterLocation, language);
      return count === 0 
        ? t.noJobsInArea.replace('{location}', locName) 
        : t.jobsFoundInArea.replace('{location}', locName).replace('{count}', count.toString());
    }
  };

  const sortChips: { id: SortOption; label: string; icon: React.ReactNode }[] = [
    {
      id: 'all',
      label: language === 'uz' ? 'Barchasi' : language === 'ru' ? 'Все' : 'All',
      icon: <Sparkles size={11} />,
    },
    {
      id: 'high_salary',
      label: language === 'uz' ? 'Katta maosh' : language === 'ru' ? 'Высокая оплата' : 'High pay',
      icon: <DollarSign size={11} />,
    },
    {
      id: 'newest',
      label: language === 'uz' ? 'Eng yangi' : language === 'ru' ? 'Свежие' : 'Newest',
      icon: <Clock size={11} />,
    },
    {
      id: 'urgent',
      label: language === 'uz' ? 'Shoshilinch' : language === 'ru' ? 'Срочные' : 'Urgent',
      icon: <TrendingUp size={11} />,
    },
  ];

  return (
    <>
      {/* Floating Re-open Tab for Desktop when collapsed */}
      {!isPanelExpanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPanelExpanded(true);
          }}
          className="hidden md:flex absolute top-1/2 right-0 -translate-y-1/2 z-30 h-16 px-2.5 bg-white/95 backdrop-blur-md rounded-l-2xl border-y border-l border-slate-200/90 shadow-[-4px_2px_16px_rgba(0,0,0,0.12)] items-center gap-2 text-slate-700 hover:text-brand-primary hover:border-brand-primary/40 transition-all cursor-pointer pointer-events-auto group select-none"
          title={language === 'ru' ? 'Показать вакансии' : language === 'en' ? 'Show jobs' : "E'lonlarni ochish"}
          aria-label={language === 'ru' ? 'Показать вакансии' : language === 'en' ? 'Show jobs' : "E'lonlarni ochish"}
        >
          <ChevronLeft size={16} className="text-slate-400 group-hover:text-brand-primary group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex flex-col items-center">
            <span className="text-[12px] font-black text-brand-primary leading-none">
              {displayedJobs.length}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
              {language === 'ru' ? 'вакансий' : language === 'en' ? 'jobs' : 'ish'}
            </span>
          </div>
        </button>
      )}

      {/* Main Container: Bottom Sheet on Mobile, Docked Right Sidebar on Desktop */}
      <div 
        className={`z-20 transition-all duration-300 ease-in-out
          fixed bottom-0 left-0 w-full
          ${isPanelExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'}
          md:translate-y-0 md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-full
          sm:w-[540px] md:w-[600px] lg:w-[640px]
          ${isPanelExpanded 
            ? 'md:translate-x-0 md:opacity-100 md:pointer-events-auto' 
            : 'md:translate-x-full md:opacity-0 md:pointer-events-none'
          }
        `}
      >
        <div 
          onClick={() => {
            if (!isPanelExpanded) {
              setIsPanelExpanded(true);
            }
          }}
          className="bg-white rounded-t-[24px] md:rounded-none md:border-l md:border-slate-200/90 shadow-2xl pb-2 md:pb-0 h-auto md:h-full flex flex-col overflow-hidden relative"
        >
          {/* Desktop Left-Edge Collapse Handle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPanelExpanded(false);
            }}
            className="hidden md:flex absolute top-1/2 -left-5 -translate-y-1/2 z-30 w-5 h-16 bg-white hover:bg-slate-50 rounded-l-xl border-y border-l border-slate-200/90 shadow-[-4px_2px_12px_rgba(0,0,0,0.08)] items-center justify-center text-slate-400 hover:text-brand-primary transition-all cursor-pointer group pointer-events-auto"
            title={language === 'ru' ? 'Свернуть панель' : language === 'en' ? 'Collapse panel' : "Panelni yig'ish"}
            aria-label={language === 'ru' ? 'Свернуть панель' : language === 'en' ? 'Collapse panel' : "Panelni yig'ish"}
          >
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Mobile Drag Handle & Header */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setIsPanelExpanded(!isPanelExpanded);
            }}
            className="md:hidden cursor-pointer select-none pt-2.5 pb-2 w-full border-b border-slate-100"
          >
            <div className="flex justify-center mb-1.5">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            <div className="text-center px-4">
              <p className="text-xs font-bold text-slate-800 truncate">
                {getJobsSummaryText()}
              </p>
              {!isPanelExpanded && displayedJobs.length > 0 && (
                <p className="text-[10px] text-brand-primary font-bold mt-0.5">
                  {t.clickToOpenList}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex flex-col border-b border-slate-100 bg-white shrink-0 select-none">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {getJobsSummaryText()}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {sortedJobs.length > 0 
                          ? (language === 'ru' 
                              ? `${sortedJobs.length} активных вакансий` 
                              : language === 'en' 
                              ? `${sortedJobs.length} active jobs` 
                              : `${sortedJobs.length} ta faol e'lon`)
                          : (language === 'ru' ? 'Вакансии не найдены' : language === 'en' ? 'No jobs found' : "E'lonlar topilmadi")
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Switcher & Collapse */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {/* Segmented View Mode Switcher */}
                <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode('grid');
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-brand-primary shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={language === 'ru' ? 'Сетка (2 колонки)' : language === 'en' ? 'Grid (2 columns)' : "2 ustunli katak"}
                    aria-label={language === 'ru' ? 'Сетка (2 колонки)' : language === 'en' ? 'Grid (2 columns)' : "2 ustunli katak"}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode('list');
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-brand-primary shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={language === 'ru' ? 'Список (1 колонка)' : language === 'en' ? 'List (1 column)' : "1 ustunli ro'yxat"}
                    aria-label={language === 'ru' ? 'Список (1 колонка)' : language === 'en' ? 'List (1 column)' : "1 ustunli ro'yxat"}
                  >
                    <LayoutList size={15} />
                  </button>
                </div>

                {/* Close/Collapse Icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPanelExpanded(false);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none shrink-0"
                  title={language === 'ru' ? 'Свернуть' : language === 'en' ? 'Collapse' : 'Yopish'}
                  aria-label={language === 'ru' ? 'Свернуть' : language === 'en' ? 'Collapse' : 'Yopish'}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* In-Panel Quick Search */}
            <div className="px-5 pt-1 pb-2">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'uz' ? "Kassir, haydovchi, kompaniya..." : language === 'ru' ? "Кассир, водитель, компания..." : "Search title, company..."}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-8.5 pr-8 py-1.5 rounded-xl border border-slate-200/80 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer border-none"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Sort / Filter Chips */}
            <div className="flex items-center gap-1.5 px-5 pb-3 overflow-x-auto no-scrollbar">
              {sortChips.map((chip) => {
                const isActive = activeSort === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSort(chip.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/70 font-medium'
                    }`}
                  >
                    {chip.icon}
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          {isRefreshing ? (
            <>
              {/* Mobile Skeleton */}
              <div className="md:hidden relative w-full overflow-hidden">
                <JobCardSkeleton count={3} layout="horizontal" />
              </div>
              {/* Desktop Skeleton */}
              <div className={`hidden flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar ${
                viewMode === 'grid' ? 'md:grid md:grid-cols-2 gap-3' : 'md:flex md:flex-col gap-2.5'
              }`}>
                <JobCardSkeleton count={6} layout={viewMode} />
              </div>
            </>
          ) : sortedJobs.length === 0 ? (
            <div className="px-4 py-8 md:py-16 flex flex-col items-center justify-center text-center flex-1">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100/70 flex items-center justify-center text-brand-primary mb-3 shadow-inner">
                <Briefcase size={22} className="stroke-[1.8] text-brand-primary" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {t.noJobsListedYet}
              </h4>
              <p className="text-xs text-slate-500 max-w-[280px] mt-1.5 leading-normal">
                {searchQuery ? (language === 'uz' ? `"${searchQuery}" bo'yicha hech qanday e'lon topilmadi` : `Ничего не найдено по запросу "${searchQuery}"`) : t.noJobsListedYetDesc}
              </p>
              {filterLocation !== 'Barchasi' && (
                <button
                  type="button"
                  onClick={handleResetMap}
                  className="mt-4 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-primary/95 transition-all cursor-pointer border-none"
                >
                  {language === 'uz' ? "Barcha hududlarni ko'rsatish" : language === 'ru' ? "Показать все регионы" : "Show all regions"}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: Horizontal scrollable Job Cards */}
              <div className="md:hidden relative w-full overflow-hidden">
                <div 
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    setIsAtBeginning(target.scrollLeft < 10);
                  }}
                  className={`px-6 pt-1.5 pb-2 overflow-x-auto no-scrollbar flex gap-3 snap-x snap-mandatory scroll-smooth w-full ${
                    sortedJobs.length === 1 ? 'justify-center' : ''
                  }`}
                >
                  {sortedJobs.map(job => (
                    <div key={job.id} className="min-w-[calc(100vw-64px)] sm:min-w-[280px] shrink-0 snap-center">
                      <JobCardItem
                        job={job}
                        language={language}
                        selectedJob={selectedJob}
                        handleJobSelect={handleJobSelect}
                        userLocation={userLocation}
                        applied={appliedJobIds.has(job.id)}
                        applyToJob={applyToJob}
                        layoutMode="list"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: Dynamic List or Grid View */}
              <div 
                className={`hidden flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar scroll-smooth ${
                  viewMode === 'grid'
                    ? 'md:grid md:grid-cols-2 gap-3 content-start'
                    : 'md:flex md:flex-col gap-2.5'
                }`}
              >
                {sortedJobs.map(job => (
                  <JobCardItem
                    key={job.id}
                    job={job}
                    language={language}
                    selectedJob={selectedJob}
                    handleJobSelect={handleJobSelect}
                    userLocation={userLocation}
                    applied={appliedJobIds.has(job.id)}
                    applyToJob={applyToJob}
                    layoutMode={viewMode}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
