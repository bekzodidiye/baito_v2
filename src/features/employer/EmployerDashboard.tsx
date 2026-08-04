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
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const dates = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const localYYYYMMDD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      dayStr: language === 'uz' 
        ? ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][d.getDay()]
        : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()],
      dateNum: d.getDate(),
      index: i,
      fullDateStr: localYYYYMMDD
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((d) => (
            <button
              key={d.index}
              onClick={() => setSelectedDate(d.index)}
              className={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-2xl border transition-all cursor-pointer shrink-0 ${
                selectedDate === d.index 
                  ? 'bg-brand-primary text-white border-brand-primary shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedDate === d.index ? 'text-white/80' : 'text-slate-400'}`}>
                {d.dayStr}
              </span>
              <span className="font-display font-black text-xl mt-0.5">{d.dateNum}</span>
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
