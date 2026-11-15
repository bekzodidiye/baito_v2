import React, { useState } from 'react';
import { Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { Job } from '../../types';
import { JobCardSkeleton } from './JobCardSkeleton';
import { useJobsData } from "../../context/useJobsData";
import { translations, translateRegion } from '../../translations';
import { JobCardItem } from './JobCardItem';
import { useAuthStore } from "../../store/useAuthStore";

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
  const [isAtBeginning, setIsAtBeginning] = useState(true);

  const appliedJobIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (j.applied) set.add(j.id);
    }
    return set;
  }, [jobs]);

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

  return (
    <>
      {/* Floating Re-open Button for Desktop when collapsed */}
      {!isPanelExpanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPanelExpanded(true);
          }}
          className="hidden md:flex absolute top-4 right-4 z-20 items-center gap-2.5 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-200/90 text-slate-800 hover:text-brand-primary hover:border-brand-primary/40 transition-all font-semibold text-xs active:scale-95 cursor-pointer pointer-events-auto select-none"
          title={t.clickToOpenList || "Ro'yxatni ochish"}
          aria-label={t.clickToOpenList || "Ro'yxatni ochish"}
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-brand-primary flex items-center justify-center shrink-0">
            <Briefcase size={13} className="text-brand-primary" />
          </div>
          <span className="font-bold text-xs text-brand-text-variant">
            {displayedJobs.length} {language === 'ru' ? 'вакансий' : language === 'en' ? 'jobs' : 'ta ish'}
          </span>
          <ChevronLeft size={16} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
        </button>
      )}

      {/* Main Container: Bottom Sheet on Mobile, Floating Right Panel on Desktop */}
      <div 
        className={`z-20 transition-all duration-300 ease-in-out
          fixed md:absolute bottom-0 left-0 w-full
          ${isPanelExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'}
          md:translate-y-0 md:bottom-4 md:top-4 md:left-auto md:right-4
          sm:w-[540px] md:w-[600px] lg:w-[640px]
          ${isPanelExpanded 
            ? 'md:translate-x-0 md:opacity-100 md:pointer-events-auto' 
            : 'md:translate-x-[calc(100%+2rem)] md:opacity-0 md:pointer-events-none'
          }
        `}
      >
        <div 
          onClick={() => {
            if (!isPanelExpanded) {
              setIsPanelExpanded(true);
            }
          }}
          className="bg-white rounded-t-[20px] md:rounded-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.20),_0_-4px_16px_rgba(0,0,0,0.12)] md:shadow-[0_12px_40px_rgba(0,0,0,0.14)] md:border md:border-slate-200/90 pb-2 md:pb-0 h-auto md:h-full flex flex-col overflow-hidden"
        >
          {/* Mobile Drag Handle & Header */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setIsPanelExpanded(!isPanelExpanded);
            }}
            className="md:hidden cursor-pointer select-none pt-2 pb-1.5 w-full"
          >
            {/* Bottom Sheet Drag Handle */}
            <div className="flex justify-center mb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Result Count */}
            <div className="text-center px-4">
              <p className="text-xs font-bold text-brand-text-variant truncate">
                {getJobsSummaryText()}
              </p>
              {!isPanelExpanded && displayedJobs.length > 0 && (
                <p className="text-[9px] text-brand-primary font-bold mt-0.5 animate-pulse">
                  {t.clickToOpenList}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Header with Collapse Button */}
          <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 select-none">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-brand-primary shrink-0">
                  <Briefcase size={15} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {getJobsSummaryText()}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 ml-9">
                {displayedJobs.length > 0 
                  ? (language === 'ru' 
                      ? `${displayedJobs.length} активных вакансий` 
                      : language === 'en' 
                      ? `${displayedJobs.length} active jobs` 
                      : `${displayedJobs.length} ta faol e'lon`)
                  : (language === 'ru' ? 'Вакансии не найдены' : language === 'en' ? 'No jobs found' : "E'lonlar topilmadi")
                }
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPanelExpanded(false);
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer border-none shrink-0 ml-2"
              title={language === 'ru' ? 'Свернуть' : language === 'en' ? 'Collapse' : 'Yopish'}
              aria-label={language === 'ru' ? 'Свернуть' : language === 'en' ? 'Collapse' : 'Yopish'}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Content Area */}
          {isRefreshing ? (
            <>
              {/* Mobile Skeleton */}
              <div className="md:hidden relative w-full overflow-hidden">
                <JobCardSkeleton count={3} layout="horizontal" />
              </div>
              {/* Desktop Skeleton */}
              <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar">
                <JobCardSkeleton count={6} layout="vertical" />
              </div>
            </>
          ) : displayedJobs.length === 0 ? (
            <div className="px-4 py-6 md:py-12 flex flex-col items-center justify-center text-center flex-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center text-brand-primary mb-3 shadow-inner">
                <Briefcase size={20} className="stroke-[1.8] text-brand-primary" />
              </div>
              <h4 className="text-xs md:text-sm font-bold text-slate-800">
                {t.noJobsListedYet}
              </h4>
              <p className="text-[11px] md:text-xs text-slate-500 max-w-[280px] mt-1.5 leading-normal">
                {t.noJobsListedYetDesc}
              </p>
              {filterLocation !== 'Barchasi' && (
                <button
                  type="button"
                  onClick={handleResetMap}
                  className="mt-4 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-primary/95 transition-all cursor-pointer border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  {language === 'uz' ? "Barcha hududlarni ko'rsatish" : language === 'ru' ? "Показать все регионы" : "Show all regions"}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: Horizontal scrollable Job Cards */}
              <div className="md:hidden relative w-full overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/75 to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/75 to-transparent pointer-events-none z-10" />
                <div 
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    setIsAtBeginning(target.scrollLeft < 10);
                  }}
                  className={`px-8 pt-1.5 pb-2 overflow-x-auto no-scrollbar flex gap-4 snap-x snap-mandatory scroll-smooth w-full ${
                    displayedJobs.length === 1 ? 'justify-center' : ''
                  }`}
                >
                  {displayedJobs.map(job => (
                    <JobCardItem
                      key={job.id}
                      job={job}
                      language={language}
                      selectedJob={selectedJob}
                      handleJobSelect={handleJobSelect}
                      userLocation={userLocation}
                      applied={appliedJobIds.has(job.id)}
                      applyToJob={applyToJob}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop: 2-column scrollable Job Cards grid */}
              <div className="hidden md:grid grid-cols-2 flex-1 min-h-0 overflow-y-auto p-4 gap-3 no-scrollbar scroll-smooth content-start">
                {displayedJobs.map(job => (
                  <JobCardItem
                    key={job.id}
                    job={job}
                    language={language}
                    selectedJob={selectedJob}
                    handleJobSelect={handleJobSelect}
                    userLocation={userLocation}
                    applied={appliedJobIds.has(job.id)}
                    applyToJob={applyToJob}
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
