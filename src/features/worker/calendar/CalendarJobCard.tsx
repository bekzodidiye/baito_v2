import React from 'react';
import { Calendar } from 'lucide-react';
import { Job } from '../../../types';

interface CalendarJobCardProps {
  job: Job;
  badge: React.ReactNode;
  setSelectedJob: (job: Job) => void;
}

export const CalendarJobCard: React.FC<CalendarJobCardProps> = ({ job, badge, setSelectedJob }) => (
  <button 
    key={job.id} 
    onClick={() => setSelectedJob(job)} 
    className="w-full text-left p-3.5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex flex-col gap-2"
  >
    <div className="flex justify-between items-start gap-3 w-full">
      <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">{job.title}</p>
      {badge}
    </div>
    <div className="flex flex-wrap items-center gap-2 mt-0.5 w-full">
      <div className="flex items-center gap-2 flex-1 min-w-[100px]">
        <p className="text-[11px] text-slate-500 font-medium truncate">{job.company}</p>
        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{job.time}</p>
      </div>
      {job.periodText && (
        <p className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
          <Calendar size={10} className="text-slate-400" />
          {job.periodText.split(' ')[0]}
        </p>
      )}
    </div>
  </button>
);
