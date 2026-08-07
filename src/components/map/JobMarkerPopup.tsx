import React from 'react';
import { Job } from '../../types';
import { CategoryInfo } from '../../utils/jobCategoryUtils';

interface JobMarkerPopupProps {
  job: Job;
  category: CategoryInfo;
  categoryName: string;
  setSelectedJob: (job: Job | null) => void;
  closePopup: () => void;
}

export const JobMarkerPopup: React.FC<JobMarkerPopupProps> = ({
  job,
  category,
  categoryName,
  setSelectedJob,
  closePopup
}) => {
  return (
    <div className="font-sans text-left min-w-[180px] max-w-[240px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${category.badgeBg} ${category.badgeText}`}>
          {categoryName}
        </span>
        <span className="text-[9px] font-semibold text-brand-secondary ml-auto">{job.salary}</span>
      </div>
      <h4 className="text-xs font-bold text-brand-primary leading-tight font-display mb-1 truncate">{job.title}</h4>
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-[10px] text-brand-text-variant font-semibold truncate">{job.company}</p>
        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
        <p className="text-[9px] text-brand-text-variant font-medium whitespace-nowrap">{job.time}</p>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-brand-text-variant/80 border-t border-brand-surface-low pt-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span className="truncate">{job.location}</span>
      </div>
      <button 
        className="w-full mt-2 bg-brand-primary text-white text-[10px] font-bold py-1.5 rounded active:scale-95 transition-transform cursor-pointer border-none"
        onClick={() => {
          setSelectedJob(job);
          closePopup();
        }}
      >
        Batafsil
      </button>
    </div>
  );
};
