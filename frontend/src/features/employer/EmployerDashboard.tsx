import React, { useState, useRef, useEffect } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Plus } from 'lucide-react';
import { EmployerStatsBanner } from './EmployerStatsBanner';
import { EmployerJobsList } from './EmployerJobsList';

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
  const activeJobsCount = postedJobs.filter(j => j.status !== 'completed').length;
  const pendingApplicantsCount = applications.filter(a => a.status === 'applied').length;
  const totalViews = 1204;
  const avgFillRate = 85;

  // Date picker state
  const TOTAL_DAYS = 15;
  const PAST_DAYS = 7;
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

  // Filter jobs by selected date
  const selectedFullDateStr = dates[selectedDate].fullDateStr;
  const filteredJobs = postedJobs.filter(job => job.workDate === selectedFullDateStr);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-6">
      
      {/* Top Banner & Stats */}
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

      <div className="flex flex-col gap-6">
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
                  {d.isToday ? (language === 'uz' ? 'Bugun' : 'Сегодня') : d.dayStr}
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
      </div>
    </div>
  );
};
