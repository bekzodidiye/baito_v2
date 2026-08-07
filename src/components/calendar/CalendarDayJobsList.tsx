import React from 'react';
import { CheckCircle2, AlertCircle, Star, Calendar } from 'lucide-react';
import { Job } from '../../types';

interface CalendarDayJobsListProps {
  currentDayJobs: Job[];
  selectedDay: number;
  currentMonth: number;
  currentYear: number;
  language: 'uz' | 'ru' | 'en';
  MONTHS_TRANSLATIONS: any;
  setSelectedJob: (job: Job) => void;
  getJobRelation: (job: Job) => 'past' | 'present' | 'future';
}

export const CalendarDayJobsList: React.FC<CalendarDayJobsListProps> = ({
  currentDayJobs,
  selectedDay,
  currentMonth,
  currentYear,
  language,
  MONTHS_TRANSLATIONS,
  setSelectedJob,
  getJobRelation
}) => {
  if (currentDayJobs.length === 0) return null;

  const renderJobCard = (job: Job, badge: React.ReactNode) => (
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

  return (
    <section className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-200/80 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-display font-bold text-sm text-brand-text">
          {selectedDay} - {MONTHS_TRANSLATIONS[language][currentMonth]} {currentYear}{language === 'ru' ? ' года' : ''}
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {currentDayJobs.map(job => {
          let badge = null;
          if (job.status === 'completed') {
            badge = <span className="shrink-0 bg-indigo-50 text-brand-primary border border-indigo-100 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} className="fill-current" />{language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Tugallandi'}</span>;
          } else if (job.status === 'in_progress' || job.status === 'start_requested') {
            badge = <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} />Ish boshlandi</span>;
          } else if (job.status === 'confirmed' || job.status === 'todo') {
            badge = <span className="shrink-0 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><AlertCircle size={10} />{language === 'ru' ? 'Готово к началу' : language === 'en' ? 'Ready to start' : 'Boshlashga tayyor'}</span>;
          } else if (job.status === 'applied' || job.applied) {
            badge = <span className="shrink-0 bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center">{language === 'ru' ? 'Отправлено' : language === 'en' ? 'Applied' : 'Yuborildi'}</span>;
          }
          return renderJobCard(job, badge);
        })}
      </div>
    </section>
  );
};
