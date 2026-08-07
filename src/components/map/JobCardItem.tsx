import React from 'react';
import { Briefcase, MapPin, Navigation, Clock, Share2, Info, Users } from 'lucide-react';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';
import { getJobShiftTime, getJobDuration } from '../../utils/jobTimeUtils';
import { translations } from '../../translations';

interface JobCardItemProps {
  job: Job;
  language: string;
  selectedJob: Job | null;
  handleJobSelect: (job: Job) => void;
  userLocation: { lat: number; lng: number } | null;
  applied: boolean;
  applyToJob: (id: string) => void;
}

export const JobCardItem: React.FC<JobCardItemProps> = ({
  job,
  language,
  selectedJob,
  handleJobSelect,
  userLocation,
  applied,
  applyToJob,
}) => {
  const t = translations[language];
  const jobLatLng = getLatLng(job);
  const displayTime = getJobShiftTime(job);
  const displayDuration = getJobDuration(job);

  return (
    <div
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
            <span className="px-2 py-0.5 bg-blue-50/80 text-brand-primary text-[10px] font-extrabold rounded flex items-center gap-1">
              <Users size={10} className="text-brand-primary" /> {(job.hiredCount || 0)}/{(job.vacancies || (job.neededWorkers ? parseInt(job.neededWorkers) : 1))}
            </span>
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
            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0 border-none ${
              applied
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                : 'bg-brand-primary hover:bg-brand-primary/95 text-white shadow-[0_4px_10px_rgba(37,99,235,0.18)] active:scale-[0.98]'
            }`}
          >
            {applied ? (
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
};
