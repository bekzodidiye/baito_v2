import React from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { Job } from '../../../types';

interface CalendarDayTooltipProps {
  isFirstTwoRows: boolean;
  colIndex: number;
  tooltipTitle: string;
  tooltipColor: string;
  tooltipJobs: Job[];
  status: 'applied' | 'confirmed' | 'todo' | 'completed' | 'missed' | null;
  language: 'uz' | 'ru' | 'en';
  setSelectedJob: (job: Job | null) => void;
}

export const CalendarDayTooltip: React.FC<CalendarDayTooltipProps> = ({
  isFirstTwoRows,
  colIndex,
  tooltipTitle,
  tooltipColor,
  tooltipJobs,
  status,
  language,
  setSelectedJob
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: isFirstTwoRows ? 5 : -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: isFirstTwoRows ? 5 : -5 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`absolute flex z-50 ${
        isFirstTwoRows ? 'top-full pt-1 flex-col-reverse' : 'bottom-full pb-1 flex-col'
      } ${
        colIndex <= 1 ? 'left-0 items-start' : colIndex >= 5 ? 'right-0 items-end' : 'left-1/2 -translate-x-1/2 items-center'
      }`}
    >
      <div className="bg-white p-2.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 w-[220px] max-h-56 overflow-hidden flex flex-col gap-1.5 text-left">
        <span className={`font-bold border-b border-slate-100 pb-1.5 mb-0.5 uppercase tracking-wider text-[10px] ${tooltipColor}`}>
          {tooltipTitle}
        </span>
        {tooltipJobs.slice(0, 3).map(job => (
          <button 
            key={job.id} 
            onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }} 
            className="w-full p-2 bg-brand-surface-low hover:bg-slate-50 active:bg-slate-100 transition-colors rounded-xl border border-slate-50 flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex-1 truncate mr-2">
              <p className="text-[11px] font-bold text-brand-text truncate">{job.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[9px] text-brand-text-variant font-medium truncate">{job.company}</p>
                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                <p className="text-[9px] text-brand-text-variant font-medium whitespace-nowrap">{job.time}</p>
                {job.periodText && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                    <p className="text-[8px] text-slate-500 flex items-center gap-0.5 shrink-0 font-medium">
                      <Calendar size={8} className="text-slate-400" />
                      {job.periodText.split(' ')[0]}
                    </p>
                  </>
                )}
              </div>
            </div>
            {status === 'applied' && <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[8px] px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">{language === 'ru' ? 'Отправлено' : language === 'en' ? 'Applied' : 'Yuborildi'}</span>}
            {status === 'confirmed' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[8px] px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">{language === 'ru' ? 'Подтверждено' : language === 'en' ? 'Confirmed' : 'Tasdiqlandi'}</span>}
            {status === 'todo' && <span className="bg-rose-100 text-rose-850 border border-rose-200 font-bold text-[8px] px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">{language === 'ru' ? 'Сегодня' : language === 'en' ? 'To Do' : 'Bugun qilinadi'}</span>}
            {status === 'completed' && <span className="bg-indigo-50 text-brand-primary border border-indigo-100 font-bold text-[8px] px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">{language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Yakunlandi'}</span>}
          </button>
        ))}
        {tooltipJobs.length > 3 && (
          <div className="text-slate-400 font-medium italic mt-1 text-[10px] text-center">
            {language === 'ru' ? `+ еще ${tooltipJobs.length - 3}` : language === 'en' ? `+ ${tooltipJobs.length - 3} more` : `+${tooltipJobs.length - 3} ta yana...`}
          </div>
        )}
      </div>
      <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
        isFirstTwoRows ? 'border-b-[6px] border-b-white relative -bottom-[1px]' : 'border-t-[6px] border-t-white relative -top-[1px]'
      } ${
        colIndex <= 1 ? 'ml-[16px]' : colIndex >= 5 ? 'mr-[16px]' : ''
      }`}></div>
    </motion.div>
  );
};
