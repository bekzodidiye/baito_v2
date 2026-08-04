import React from 'react';
import { Star, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../../types';
import { MONTHS_TRANSLATIONS, isJobOnDay } from './CalendarScreen.utils';

interface CalendarDayButtonProps {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  status: 'applied' | 'confirmed' | 'todo' | 'completed' | 'missed' | null;
  activeTooltipDay: number | null;
  handleDayClick: (day: number) => void;
  jobs: Job[];
  language: 'uz' | 'ru' | 'en';
  currentYear: number;
  currentMonth: number;
  yearFromContext: number;
  monthFromContext: number;
  dayFromContext: number;
  slotIndex: number;
  setSelectedJob: (job: Job | null) => void;
}

export const CalendarDayButton: React.FC<CalendarDayButtonProps> = ({
  day,
  isSelected,
  isToday,
  status,
  activeTooltipDay,
  handleDayClick,
  jobs,
  language,
  currentYear,
  currentMonth,
  yearFromContext,
  monthFromContext,
  dayFromContext,
  slotIndex,
  setSelectedJob
}) => {
  // Determine day button classes & inner elements dynamically
  let buttonClasses = "w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all duration-150 ease-out active:scale-75 active:opacity-95 transform-gpu relative cursor-pointer ";
  let content: React.ReactNode = <span className={isToday ? "-translate-y-[2px]" : ""}>{day}</span>;

  // Set up base styling based on status/day type
  if (status === 'completed') {
    buttonClasses += `bg-transparent text-brand-primary transition-all duration-150 ${!isSelected ? 'hover:scale-105' : ''}`;
    content = (
      <div className="relative w-full h-full flex items-center justify-center transition-transform">
        <Star 
          size={36} 
          className={`absolute fill-brand-primary text-brand-primary transition-all ${isSelected ? 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]' : 'drop-shadow-md'}`}
          style={{ filter: 'url(#star-3d)' }}
        />
        <span className={`relative z-10 text-[10px] text-white font-black leading-none pb-[2px] ${isToday ? '-translate-y-[2px]' : ''} ${isSelected ? 'opacity-90' : ''}`}>{day}</span>
      </div>
    );
  } else if (status === 'applied') {
    buttonClasses += `bg-amber-500 text-white shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(146,64,14,0.4),_0_3px_8px_rgba(245,158,11,0.35)] hover:bg-amber-500/90 hover:shadow-[0_4px_12px_rgba(245,158,11,0.45)] ${!isSelected ? 'hover:scale-105' : ''}`;
  } else if (status === 'confirmed') {
    buttonClasses += `bg-emerald-500 text-white shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(6,95,70,0.4),_0_3px_8px_rgba(16,185,129,0.35)] hover:bg-emerald-500/90 hover:shadow-[0_4px_12px_rgba(16,185,129,0.45)] ${!isSelected ? 'hover:scale-105' : ''}`;
  } else if (status === 'todo') {
    buttonClasses += `bg-rose-500 text-white shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(159,18,57,0.4),_0_3px_8px_rgba(244,63,94,0.35)] hover:bg-rose-500/90 hover:shadow-[0_4px_12px_rgba(244,63,94,0.45)] ${!isSelected ? 'hover:scale-105' : ''}`;
  } else if (status === 'missed') {
    buttonClasses += `bg-white border-2 border-dashed border-rose-400 text-rose-500 shadow-sm hover:bg-rose-50 ${!isSelected ? 'hover:scale-105' : ''}`;
  } else if (isToday) {
    buttonClasses += `bg-white border border-brand-primary/50 text-brand-primary font-bold hover:bg-slate-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${!isSelected ? 'hover:scale-105' : ''}`;
  } else {
    buttonClasses += `text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold ${!isSelected ? 'hover:scale-105' : ''}`;
  }

  // Apply selected modifiers
  if (isSelected) {
    buttonClasses += " scale-90 z-10";
    if (status === 'completed') {
      buttonClasses += " opacity-90";
    } else if (status === 'applied') {
      buttonClasses += " shadow-[inset_0_4px_8px_rgba(120,53,4,0.85)] border border-amber-600/40";
    } else if (status === 'confirmed') {
      buttonClasses += " shadow-[inset_0_4px_8px_rgba(2,48,32,0.85)] border border-emerald-600/40";
    } else if (status === 'todo') {
      buttonClasses += " shadow-[inset_0_4px_8px_rgba(136,19,55,0.85)] border border-rose-600/40";
    } else if (!status) {
      if (isToday) {
        buttonClasses += " bg-white border-brand-primary shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)]";
      } else {
        buttonClasses += " bg-white border border-slate-300 text-slate-800 shadow-[inset_0_3px_6px_rgba(0,0,0,0.1)]";
      }
    }
  }

  const jobsOnThisDay = (jobs || []).filter(j => isJobOnDay(j, day, currentYear, currentMonth));
  const filteredJobs = jobsOnThisDay.filter(j => j.status !== 'none' || j.applied);
  
  let oneJob: Job | undefined = undefined;
  if (status === 'completed') {
    oneJob = filteredJobs.find(j => j.status === 'completed' && j.periodText && !j.periodText.split(' ')[0].includes('~')) || filteredJobs.find(j => j.status === 'completed');
  } else if (status === 'todo' || status === 'confirmed') {
    oneJob = filteredJobs.find(j => (j.status === 'confirmed' || j.status === 'todo') && j.periodText && !j.periodText.split(' ')[0].includes('~')) || filteredJobs.find(j => j.status === 'confirmed' || j.status === 'todo');
  } else if (status === 'applied') {
    oneJob = filteredJobs.find(j => (j.status === 'applied' || j.applied) && j.periodText && !j.periodText.split(' ')[0].includes('~')) || filteredJobs.find(j => j.status === 'applied' || j.applied);
  }
  
  if (!oneJob) {
    oneJob = filteredJobs.find(j => j.periodText && !j.periodText.split(' ')[0].includes('~')) || filteredJobs[0];
  }
  
  let tooltipJobs: Job[] = oneJob ? [oneJob] : [];
  const monthName = MONTHS_TRANSLATIONS[language][currentMonth];
  let tooltipTitle = language === 'ru' 
    ? `Задачи на ${day} ${monthName}` 
    : language === 'en' 
      ? `Tasks for ${monthName} ${day}` 
      : `${day}-${monthName} kungi ishlar`;
  let tooltipColor = 'text-slate-700';
  
  if (status === 'applied') {
    tooltipColor = 'text-amber-600';
  } else if (status === 'confirmed') {
    tooltipColor = 'text-emerald-600';
  } else if (status === 'todo') {
    tooltipColor = 'text-rose-600';
  } else if (status === 'completed') {
    tooltipColor = 'text-brand-primary';
  }

  const isFirstTwoRows = Math.floor(slotIndex / 7) <= 1;
  const colIndex = slotIndex % 7;

  return (
    <div className="relative flex flex-col items-center justify-center p-1 group">
      <motion.button
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 450, damping: 15 }}
        onClick={() => handleDayClick(day)}
        className={buttonClasses}
      >
        {content}
        {isToday && (
          <div className={`absolute bottom-1 w-[5px] h-[5px] rounded-full ${status ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : 'bg-brand-primary shadow-xs'}`} />
        )}
      </motion.button>
      
      <AnimatePresence>
        {status && tooltipJobs.length > 0 && activeTooltipDay === day && (
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
        )}
      </AnimatePresence>
    </div>
  );
};
