import React, { useState } from 'react';
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
      />

      <div className="px-4 md:px-6 flex flex-col gap-6">
        {/* Action Button */}
        <button
          onClick={onPostJobClick}
          className="w-full md:w-auto md:self-start py-3.5 px-6 bg-brand-primary hover:bg-brand-primary/95 text-white font-display font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>{language === 'uz' ? "Yangi ish yaratish" : language === 'ru' ? "Создать объявление" : "Post new job"}</span>
        </button>

        {/* Date Picker */}
        <div className="bg-white rounded-[24px] p-2 shadow-xs border border-slate-100 flex items-center gap-1 overflow-x-auto scrollbar-hide snap-x">
          {dates.map((d) => (
            <button
              key={d.index}
              onClick={() => setSelectedDate(d.index)}
              className={`snap-center flex flex-col items-center justify-center min-w-[64px] h-[76px] rounded-[18px] transition-all cursor-pointer shrink-0 relative ${
                selectedDate === d.index 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-100' 
                  : 'bg-transparent text-slate-700 hover:bg-slate-50 scale-[0.98] hover:scale-100'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${selectedDate === d.index ? 'text-white/90' : 'text-slate-400'}`}>
                {d.isToday ? (language === 'uz' ? 'Bugun' : 'Сегодня') : d.dayStr}
              </span>
              <span className="font-display font-black text-xl">{d.dateNum}</span>
              {d.isToday && selectedDate !== d.index && (
                <div className="absolute bottom-2 w-1.5 h-1.5 bg-brand-primary rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        <EmployerJobsList 
          language={language}
          postedJobs={filteredJobs}
          onViewAllJobsClick={onViewAllJobsClick}
        />
      </div>
    </div>
  );
};
