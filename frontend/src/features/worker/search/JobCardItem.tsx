import React, { memo } from 'react';
import { Briefcase, MapPin, Clock, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Job } from '../../../types';
import { getJobShiftTime, getJobDuration } from '../../../utils/jobTimeUtils';
import { getJobCategory } from '../../../utils/jobCategoryUtils';
import { useApp } from '../../../context/AppContext';

interface JobCardItemProps {
  job: Job;
  idx: number;
  onClick: () => void;
  toggleBookmark: (id: string) => void;
  isActive?: boolean;
}

const getTagStyles = (tag: string) => {
  const t = tag.toLowerCase();
  if (t.includes('kunlik') || t.includes('smena') || t.includes('day')) {
    return 'bg-blue-50/70 text-blue-600 border-blue-100/60';
  }
  if (t.includes('tushlik') || t.includes('yotoq') || t.includes('ovqat') || t.includes('lunch') || t.includes('food') || t.includes('bepul')) {
    return 'bg-emerald-50/70 text-emerald-600 border-emerald-100/60';
  }
  if (t.includes('shoshilinch') || t.includes('og\'ir') || t.includes('tezkor') || t.includes('urgent') || t.includes('heavy')) {
    return 'bg-rose-50/70 text-rose-600 border-rose-100/60';
  }
  if (t.includes('oson') || t.includes('yengil') || t.includes('easy') || t.includes('erkin')) {
    return 'bg-amber-50/70 text-amber-600 border-amber-100/60';
  }
  return 'bg-slate-50/80 text-slate-500 border-slate-100';
};

const JobCardItemComponent: React.FC<JobCardItemProps> = ({
  job,
  idx,
  onClick,
  toggleBookmark,
  isActive = false,
}) => {
  const { language } = useApp();
  const category = getJobCategory(job);
  const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min((idx % 6) * 0.02, 0.1), ease: "easeOut" }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 flex flex-col gap-3.5 relative transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'ring-2 ring-brand-primary/20 bg-brand-primary/[0.02] shadow-[0_12px_28px_rgba(0,6,102,0.08)]' 
          : 'shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,6,102,0.06)] border border-transparent hover:border-brand-primary/10'
      } group`}
    >
      {/* Interactive Action Buttons directly on card */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
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
          className="p-1.5 rounded-full hover:bg-brand-primary/10 text-slate-400 hover:text-brand-primary transition-colors cursor-pointer shrink-0 bg-slate-50/50 border border-slate-100"
          type="button"
          title="Share"
        >
          <Share2 size={14} />
        </button>
      </div>

      <div className="flex gap-3.5 items-start">
        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 shadow-3xs transition-transform group-hover:scale-105 duration-200">
          {job.logoUrl ? (
            <img src={job.logoUrl} alt={job.company} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Briefcase size={20} className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-7">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center gap-1.5 ${category.badgeBg} ${category.badgeText} ${category.borderClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${category.dotBg}`} />
              {categoryName}
            </span>
          </div>
          <h2 className="font-sans font-bold text-sm md:text-[14px] text-slate-800 leading-snug truncate group-hover:text-brand-primary transition-colors">
            {job.title}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-slate-400 font-bold truncate">
              {job.company}
            </p>
            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
              {getJobDuration(job)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <p className="font-sans font-extrabold text-brand-primary text-base leading-none">
          {job.salary}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {(job.tags || []).slice(0, 3).map((tag, tIdx) => (
          <span
            key={tIdx}
            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border transition-colors ${getTagStyles(tag)}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="h-[1px] bg-slate-100/80 w-full" />

      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
            <Clock size={11} className="text-slate-300 shrink-0" />
            <span className="truncate">{getJobShiftTime(job)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
            <MapPin size={11} className="text-slate-300 shrink-0" />
            <span className="truncate">{job.location}</span>
            {job.distanceKm !== undefined && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                <span className="text-brand-primary font-bold">{job.distanceKm < 1 ? '< 1 km' : `${Math.round(job.distanceKm)} km`}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-[10px] font-extrabold text-brand-primary shrink-0 self-end bg-brand-primary/10 px-2.5 py-0.5 rounded-lg">
          {job.durationLabel || "12 soat"}
        </span>
      </div>
    </motion.article>
  );
};

export const JobCardItem = memo(JobCardItemComponent);
