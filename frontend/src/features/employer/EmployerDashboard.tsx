import React, { useState, useRef, useEffect } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { motion } from 'motion/react';
import { EmployerStatsBanner } from './EmployerStatsBanner';
import { EmployerJobsList } from './EmployerJobsList';
import { parseWorkDates } from '../../utils/workDates';

interface EmployerDashboardProps {
  onPostJobClick: () => void;
  onViewApplicantsClick: () => void;
  onViewChatsClick: () => void;
  onViewAllJobsClick: () => void;
  onViewAnalyticsClick?: () => void;
}

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  onPostJobClick,
  onViewAllJobsClick,
  onViewApplicantsClick,
  onViewChatsClick,
  onViewAnalyticsClick
}) => {
  const { postedJobs, applications, language } = useEmployer();
  
  // Stats
  const activeJobsCount = postedJobs.filter(j => !(['completed', 'cancelled', 'closed'].includes(j.status) && j.payoutStatus !== 'invoiced' && j.payoutStatus !== 'payment_declared')).length;
  const pendingApplicantsCount = applications.filter(a => a.status === 'applied').length;
  // These two were fixed at 1204 and 85 — an employer with no postings at all
  // was still shown 1,204 views and an 85% fill rate as their own figures.
  const totalViews = postedJobs.reduce((sum, j) => sum + (Number(j.views) || 0), 0);
  const vacancyTotal = postedJobs.reduce(
    (sum, j) => sum + (Number(j.vacancies) || Number(j.neededWorkers) || 1), 0);
  const hiredTotal = postedJobs.reduce((sum, j) => sum + (Number(j.hiredCount) || 0), 0);
  const avgFillRate = vacancyTotal > 0 ? Math.round((hiredTotal / vacancyTotal) * 100) : 0;

  // Date picker state
  const TOTAL_DAYS = 37;
  const PAST_DAYS = 30;
  const [selectedDate, setSelectedDate] = useState<number>(PAST_DAYS);
  const dates = Array.from({ length: TOTAL_DAYS }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - PAST_DAYS + i);
    const localYYYYMMDD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = i === PAST_DAYS;
    return {
      dayStr: language === 'uz' 
        ? ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][d.getDay()]
        : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()],
      dateNum: d.getDate(),
      index: i,
      fullDateStr: localYYYYMMDD,
      isToday
    };
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[selectedDate] as HTMLElement;
      if (activeElement) {
        // A slight timeout ensures the DOM is fully painted before scrolling
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }
    }
  }, []); // Run once on mount

  // The postings worked on the chosen day.
  //
  // This compared `job.workDate === selectedFullDateStr`. A posting's workDate
  // holds every day it is worked — "2026-09-20, 2026-09-21, 2026-09-22" — and
  // that string equals no single day, so a shift running over more than one day
  // appeared under none of them. `parseWorkDates` is what the rest of the app
  // reads the field with.
  //
  // Cancelled postings are left out. The day strip answers "what is happening
  // on this day", and they are not: two cancelled test postings showed under
  // today while the jobs screen counted, correctly, none open.
  const selectedFullDateStr = dates[selectedDate].fullDateStr;
  const filteredJobs = postedJobs.filter(job =>
    job.status !== 'cancelled'
    && parseWorkDates(job.workDate).includes(selectedFullDateStr),
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-6">
      
      {/* Top Banner & Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <EmployerStatsBanner 
          language={language}
          activeJobsCount={activeJobsCount}
          pendingApplicantsCount={pendingApplicantsCount}
          totalViews={totalViews}
          avgFillRate={avgFillRate}
          onViewAnalyticsClick={onViewAnalyticsClick}
          onViewAllJobsClick={onViewAllJobsClick}
          onViewApplicantsClick={onViewApplicantsClick}
          onPostJobClick={onPostJobClick}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-6">
        {/* Date Picker */}
        <div ref={scrollContainerRef} className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x px-4 md:px-6">
          {dates.map((d) => {
            const isActive = selectedDate === d.index;
            return (
              <button
                key={d.index}
                onClick={() => setSelectedDate(d.index)}
                className={`snap-center flex flex-col items-center justify-center min-w-[68px] h-[80px] rounded-[22px] transition-all cursor-pointer shrink-0 relative ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-[0_8px_16px_rgba(0,6,102,0.24)] scale-100' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 scale-[0.98]'
                }`}
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                  {d.isToday ? (language === 'uz' ? 'Bugun' : language === 'ru' ? 'Сегодня' : 'Today') : d.dayStr}
                </span>
                <span className={`font-display font-black text-2xl leading-none ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {d.dateNum}
                </span>
                {d.isToday && !isActive && (
                  <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-brand-primary rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Jobs List */}
        <div className="px-4 md:px-6">
          <EmployerJobsList 
            language={language}
            postedJobs={filteredJobs}
            onViewAllJobsClick={onViewAllJobsClick}
          />
        </div>
      </motion.div>
    </div>
  );
};
