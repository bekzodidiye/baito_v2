import React, { useState } from 'react';
import { Briefcase, MapPin, Navigation, Clock, Share2, Users, CheckCircle2 } from 'lucide-react';
import { Job } from '../../types';
import { getLatLng, calculateDistance } from './mapUtils';
import { getJobShiftTime, getJobDuration } from '../../utils/jobTimeUtils';
import { shareJob } from '../../utils/shareJob';
import { formatSalary } from '../../utils/money';
import { getJobTitle, getJobLocation } from '../../utils/jobTranslationUtils';
import { translations, Language } from '../../translations';

interface JobCardItemProps {
  job: Job;
  language: Language;
  selectedJob: Job | null;
  handleJobSelect: (job: Job) => void;
  userLocation: { lat: number; lng: number } | null;
  applied: boolean;
  applyToJob: (id: string) => void;
  layoutMode?: 'list' | 'grid';
}

const getCompanyInitial = (name: string): string => {
  return (name || 'B').trim().charAt(0).toUpperCase();
};

const getCompanyGradient = (name: string): string => {
  const gradients = [
    'from-indigo-600 to-blue-500',
    'from-blue-600 to-cyan-500',
    'from-emerald-600 to-teal-500',
    'from-violet-600 to-purple-500',
    'from-amber-600 to-orange-500',
    'from-rose-600 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

export const JobCardItem: React.FC<JobCardItemProps> = React.memo(({
  job,
  language,
  selectedJob,
  handleJobSelect,
  userLocation,
  applied,
  layoutMode = 'list',
}) => {
  const [imgError, setImgError] = useState(false);
  const t = translations[language];
  const jobLatLng = getLatLng(job);
  const displayTime = getJobShiftTime(job);
  const displayDuration = getJobDuration(job, language as 'uz' | 'ru' | 'en');
  const localizedTitle = getJobTitle(job, language);
  const localizedLocation = getJobLocation(job, language);
  const formattedSalary = formatSalary(job.salary, language);
  const isSelected = selectedJob?.id === job.id;

  const hasImage = Boolean((job.imageUrl || job.logoUrl) && !imgError);

  const hiredCount = Number(job.hiredCount ?? 0);
  const vacancies = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));

  const distance = userLocation 
    ? calculateDistance(userLocation.lat, userLocation.lng, jobLatLng.lat, jobLatLng.lng).toFixed(1)
    : null;

  // Render Avatar
  const renderAvatar = (sizeClass: string, textClass: string) => (
    <div className={`${sizeClass} rounded-xl overflow-hidden shrink-0 border border-slate-100/90 shadow-2xs relative`}>
      {hasImage ? (
        <img
          src={job.imageUrl || job.logoUrl}
          alt={job.company}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${getCompanyGradient(job.company)} flex items-center justify-center text-white font-black ${textClass}`}>
          {getCompanyInitial(job.company)}
        </div>
      )}
    </div>
  );

  // Render Grid View (2-Column compact mode)
  if (layoutMode === 'grid') {
    return (
      <article
        onClick={() => handleJobSelect(job)}
        className={`group p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative select-none ${
          isSelected
            ? 'bg-blue-50/50 border-brand-primary ring-2 ring-brand-primary/25 shadow-md'
            : 'bg-white border-slate-200/80 hover:border-brand-primary/40 hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        <div>
          {/* Top Row: Avatar + Title & Share */}
          <div className="flex items-start justify-between gap-2">
            {renderAvatar('w-8 h-8', 'text-xs')}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void shareJob(job, language);
              }}
              className="w-7 h-7 -mr-1 -mt-1 rounded-full flex items-center justify-center text-slate-300 hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title={t.share}
              aria-label={t.share}
            >
              <Share2 size={12} />
            </button>
          </div>

          <h3 className="text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors line-clamp-2 mt-2 leading-tight">
            {localizedTitle}
          </h3>

          <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">
            {job.company}
          </p>

          {/* Salary Pill */}
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-black tracking-tight tabular-nums">
              {formattedSalary}
            </span>
          </div>
        </div>

        {/* Footer Meta Row */}
        <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 truncate max-w-[110px]" title={localizedLocation}>
              <MapPin size={10} className="text-slate-400 shrink-0" />
              <span className="truncate">{localizedLocation}</span>
            </span>
            <span className="text-[10px] font-bold text-brand-primary shrink-0">
              {displayDuration}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 truncate">
              <Clock size={10} className="text-slate-400 shrink-0" />
              <span className="truncate">{displayTime}</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600 shrink-0">
              <Users size={10} className="text-slate-400" />
              <span>{hiredCount}/{vacancies}</span>
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Render List View (1-Column spacious and highly readable mode)
  return (
    <article
      onClick={() => handleJobSelect(job)}
      className={`group p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3.5 items-center relative select-none ${
        isSelected
          ? 'bg-blue-50/50 border-brand-primary ring-2 ring-brand-primary/25 shadow-md'
          : 'bg-white border-slate-200/80 hover:border-brand-primary/40 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Left Avatar */}
      {renderAvatar('w-11 h-11', 'text-sm')}

      {/* Middle Content */}
      <div className="min-w-0 flex-1 pr-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors truncate">
            {localizedTitle}
          </h3>
          {applied && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold shrink-0">
              <CheckCircle2 size={10} />
              {t.appliedLabel}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
          {job.company}
        </p>

        {/* Metadata Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1 truncate max-w-[140px]" title={localizedLocation}>
            <MapPin size={11} className="text-slate-400 shrink-0" />
            <span className="truncate">{localizedLocation}</span>
          </span>

          <span className="inline-flex items-center gap-1 truncate">
            <Clock size={11} className="text-slate-400 shrink-0" />
            <span className="truncate">{displayTime}</span>
          </span>

          <span className="inline-flex items-center gap-1 font-bold text-slate-600 shrink-0">
            <Users size={11} className="text-slate-400" />
            <span>{hiredCount}/{vacancies}</span>
          </span>

          {distance && (
            <span className="inline-flex items-center gap-1 text-brand-primary font-bold shrink-0">
              <Navigation size={10} className="rotate-45 fill-brand-primary/20" />
              <span>{distance} km</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Salary & Share & Duration */}
      <div className="shrink-0 flex flex-col items-end justify-between self-stretch gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void shareJob(job, language);
          }}
          className="w-7 h-7 -mr-1 -mt-1 rounded-full flex items-center justify-center text-slate-300 hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title={t.share}
          aria-label={t.share}
        >
          <Share2 size={13} />
        </button>

        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black tracking-tight tabular-nums whitespace-nowrap shadow-2xs">
          {formattedSalary}
        </span>

        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 shrink-0">
          {displayDuration}
        </span>
      </div>
    </article>
  );
}, (prev, next) => {
  return prev.job.id === next.job.id &&
         prev.language === next.language &&
         prev.layoutMode === next.layoutMode &&
         (prev.selectedJob?.id === prev.job.id) === (next.selectedJob?.id === next.job.id) &&
         prev.applied === next.applied &&
         prev.userLocation?.lat === next.userLocation?.lat &&
         prev.userLocation?.lng === next.userLocation?.lng;
});
