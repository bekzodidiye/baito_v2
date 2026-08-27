import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Job } from '../../types';
import { MapActionButtons } from './MapActionButtons';
import { JobCardSkeleton } from './JobCardSkeleton';
import { useApp } from '../../context/AppContext';
import { useJobsData } from "../../context/useJobsData";
import { translations, translateRegion } from '../../translations';
import { JobCardItem } from './JobCardItem';

interface JobSummaryCardProps {
  isPanelExpanded: boolean;
  setIsPanelExpanded: (expanded: boolean) => void;
  activeCluster: 'all' | 'cluster1' | 'cluster2';
  displayedJobs: Job[];
  selectedJob: Job | null;
  handleJobSelect: (job: Job) => void;
  toggleBookmark: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  filterLocation: string;
  isRefreshing: boolean;
  handleRefresh: () => void;
  handleResetMap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
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
  handleRefresh,
  handleResetMap,
  onZoomIn,
  onZoomOut,
  mapType,
  setMapType,
}) => {
  const { language } = useApp();
  const { jobs, applyToJob } = useJobsData();
  const t = translations[language];
  const [isAtBeginning, setIsAtBeginning] = useState(true);

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
    <div 
      className={`absolute bottom-0 left-0 w-full z-20 transition-transform duration-300 ease-in-out ${
        isPanelExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'
      }`}
    >
      <MapActionButtons 
        isRefreshing={isRefreshing}
        handleRefresh={handleRefresh}
        handleResetMap={handleResetMap}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        mapType={mapType}
        setMapType={setMapType}
      />

      <div 
        onClick={() => {
          if (!isPanelExpanded) {
            setIsPanelExpanded(true);
          }
        }}
        className="bg-white rounded-t-[20px] shadow-[0_-8px_32px_rgba(0,0,0,0.20),_0_-4px_16px_rgba(0,0,0,0.12)] pb-2 cursor-pointer"
      >
        {/* Unified Toggleable Header Area */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsPanelExpanded(!isPanelExpanded);
          }}
          className="cursor-pointer select-none pt-2 pb-1.5 w-full"
        >
          {/* Bottom Sheet Drag Handle */}
          <div className="flex justify-center mb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Result Count */}
          <div className="text-center">
            <p className="text-xs font-bold text-brand-text-variant">
              {getJobsSummaryText()}
            </p>
            {!isPanelExpanded && displayedJobs.length > 0 && (
              <p className="text-[9px] text-brand-primary font-bold mt-0.5 animate-pulse">
                {t.clickToOpenList}
              </p>
            )}
          </div>
        </div>

        {/* Horizontal scrollable Job Cards List */}
        <div className="relative w-full overflow-hidden">
          {isRefreshing ? (
            <JobCardSkeleton count={3} layout="horizontal" />
          ) : displayedJobs.length === 0 ? (
            <div className="px-4 py-4 pb-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Briefcase size={14} className="stroke-[1.5] text-indigo-500/85" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                {t.noJobsListedYet}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-[280px] mt-1.5 leading-normal">
                {t.noJobsListedYetDesc}
              </p>
              {filterLocation !== 'Barchasi' && (
                <button
                  onClick={handleResetMap}
                  className="mt-3 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-primary/95 transition-all cursor-pointer border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  {language === 'uz' ? "Barcha hududlarni ko'rsatish" : language === 'ru' ? "Показать все регионы" : "Show all regions"}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Left blur fade overlay */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/75 to-transparent pointer-events-none z-10" />
              
              {/* Right blur fade overlay */}
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
                    applied={!!jobs.find(j => j.id === job.id)?.applied}
                    applyToJob={applyToJob}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
