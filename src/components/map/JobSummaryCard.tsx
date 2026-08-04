import React, { useState } from 'react';
import { Briefcase, MapPin, Navigation, Clock, Share2, Info, DollarSign, Car, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';
import { MapActionButtons } from './MapActionButtons';
import { JobCardSkeleton } from './JobCardSkeleton';
import { useApp } from '../../context/AppContext';
import { translations, translateRegion } from '../../translations';
import { getJobShiftTime, getJobDuration } from '../../utils/jobTimeUtils';

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
  mapType?: 'xarita' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro';
  setMapType?: (type: 'xarita' | 'sputnik' | 'gibrid' | 'tungi' | 'relyef' | 'retro') => void;
}

export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({
  isPanelExpanded,
  setIsPanelExpanded,
  activeCluster,
  displayedJobs,
  selectedJob,
  handleJobSelect,
  toggleBookmark,
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
  const { language, jobs, applyToJob } = useApp();
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
                {displayedJobs.map(job => {
                  const jobLatLng = getLatLng(job);
                  const shouldAnimate = isAtBeginning && displayedJobs.length >= 2;
                  const displayTime = getJobShiftTime(job);
                  const displayDuration = getJobDuration(job);

                  return (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelect(job)}
                      className="group perspective-1000 snap-center shrink-0 min-w-[calc(100vw-64px)] max-w-[calc(100vw-64px)] sm:min-w-[250px] sm:max-w-[250px] h-[172px] relative cursor-pointer"
                    >
                      <div className="w-full h-full preserve-3d transition-transform duration-500 group-hover:rotate-y-180 relative">
                        
                        {/* Front Side */}
                        <div
                          className={`absolute inset-0 w-full h-full backface-hidden p-3 rounded-xl flex flex-col gap-1 border ${
                            selectedJob?.id === job.id
                              ? 'bg-white border-brand-primary/30 ring-1 ring-brand-primary/20 shadow-[0_20px_25px_-5px_rgba(37,99,235,0.12),_0_10px_10px_-5px_rgba(37,99,235,0.06),_inset_0_1.5px_0_rgba(255,255,255,1),_inset_0_-2px_0_rgba(37,99,235,0.05)]'
                              : 'bg-white border-slate-100 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.08),_0_4px_6px_-2px_rgba(0,0,0,0.03),_inset_0_1.5px_0_rgba(255,255,255,0.9),_inset_0_-2px_0_rgba(0,0,0,0.03)]'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({
                                  title: job.title,
                                  text: `${job.title} - ${job.company}`,
                                  url: `${window.location.origin}/?jobId=${job.id}`,
                                }).catch((error) => console.log('Error sharing', error));
                              }
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-brand-primary transition-all duration-200 cursor-pointer z-10"
                            title="Share"
                          >
                            <Share2 size={13} />
                          </button>
                          
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 shadow-xs flex items-center justify-center overflow-hidden shrink-0 border border-slate-100/90">
                              {job.logoUrl ? (
                                <img src={job.logoUrl} alt={job.company} className="w-full h-full object-cover" />
                              ) : (
                                <Briefcase size={14} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 pr-6 flex-1">
                              <h3 className="text-xs font-bold text-slate-800 leading-tight truncate">
                                {job.title}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-slate-400 font-medium truncate">
                                  {job.company}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                                <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                  {displayDuration}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-0.5 flex flex-col">
                            <p className="font-sans font-bold text-slate-900 text-[14px] leading-tight">
                              {job.salary}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {(job.tags || []).slice(0, 2).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="px-2 py-0.5 bg-slate-100/70 text-slate-500 text-[10px] font-semibold rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {userLocation && (
                              <span className="px-2 py-0.5 bg-indigo-50/70 text-brand-primary text-[10px] font-semibold rounded flex items-center gap-1">
                                <Navigation size={8} className="rotate-45 fill-brand-primary/20" />
                                {calculateDistance(userLocation.lat, userLocation.lng, jobLatLng.lat, jobLatLng.lng).toFixed(1)} km
                              </span>
                            )}
                          </div>

                          <div className="h-[1px] bg-slate-100 w-full my-1.5" />

                          <div className="flex justify-between items-end">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                                <Clock size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{displayTime}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{job.location}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-brand-primary shrink-0 self-end mb-0.5">
                              {displayDuration}
                            </span>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div
                          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 p-3 rounded-xl flex flex-col justify-between border transition-all duration-300 ${
                            selectedJob?.id === job.id
                              ? 'bg-slate-50 border-brand-primary/40 ring-1 ring-brand-primary/25 shadow-[0_12px_24px_-4px_rgba(37,99,235,0.08),_inset_0_1.5px_0_rgba(255,255,255,1)]'
                              : 'bg-slate-50/70 border-slate-200/90 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.06),_inset_0_1.5px_0_rgba(255,255,255,0.95)]'
                          }`}
                        >
                          {/* Title / Header */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Info size={11} className="text-brand-primary shrink-0" />
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                {language === 'uz' ? "Ish tavsifi" : language === 'ru' ? "Описание" : "Description"}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100/40 text-[8px] font-bold rounded shrink-0">
                              {language === 'uz' ? "Kafolatlangan" : language === 'ru' ? "Проверено" : "Verified"}
                            </span>
                          </div>

                          {/* Dynamic job detailed points */}
                          <div className="flex-1 my-1.5 flex flex-col justify-center min-h-0">
                            {/* Main description quote */}
                            <p className="text-[10.5px] leading-relaxed text-slate-600 font-medium line-clamp-3 overflow-hidden whitespace-pre-line">
                              {job.description || (
                                language === 'uz' ? "Kunlik ish faoliyati, barcha zaruriy jihozlar va tushlik ish beruvchi tomonidan ta'minlanadi." : language === 'ru' ? "Ежедневная работа, всё необходимое оборудование и обед предоставляются работодателем." : "Daily job, all necessary equipment and lunch are provided by the employer."
                              )}
                            </p>
                          </div>
                          
                          {/* Apply/Application Status Action Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              applyToJob(job.id);
                            }}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0 ${
                              jobs.find(j => j.id === job.id)?.applied
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                                : 'bg-brand-primary hover:bg-brand-primary/95 text-white shadow-[0_4px_10px_rgba(37,99,235,0.18)] active:scale-[0.98]'
                            }`}
                          >
                            {jobs.find(j => j.id === job.id)?.applied ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t.appliedLabel}
                              </span>
                            ) : t.applyNow}
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
