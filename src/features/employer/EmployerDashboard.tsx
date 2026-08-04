import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Plus, Briefcase, FileText, Eye, Activity, ChevronRight, Calendar as CalendarIcon, MapPin, CheckCircle2, Users } from 'lucide-react';
import { motion } from 'motion/react';

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
    return {
      dayStr: language === 'uz' 
        ? ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][d.getDay()]
        : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()],
      dateNum: d.getDate(),
      index: i
    };
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-6">
      
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-br from-brand-primary to-brand-primary-container md:rounded-[32px] rounded-b-[24px] px-4 md:px-8 pt-6 pb-8 relative overflow-hidden text-white shadow-lg">
        {/* Background elements */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-black">
                {language === 'uz' ? "Bugungi ishlar" : language === 'ru' ? "Сегодняшние работы" : "Today's Jobs"}
              </h1>
              <p className="text-white/70 text-xs md:text-sm font-medium mt-1">
                {language === 'uz' ? "Umumiy statistika va faol e'lonlar" : language === 'ru' ? "Общая статистика и активные объявления" : "General statistics and active jobs"}
              </p>
            </div>
            <button 
              onClick={onViewAnalyticsClick}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
            >
              {language === 'uz' ? "Statistika" : "Аналитика"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Stat Cards */}
            <div onClick={onViewAllJobsClick} className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 md:p-4 border border-white/10 cursor-pointer hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-2 mb-2 text-white/80">
                <Briefcase size={14} className="stroke-[2.5]" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  {language === 'uz' ? "Faol ishlar" : language === 'ru' ? "Активные" : "Active Jobs"}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-black">{activeJobsCount}</p>
            </div>

            <div onClick={onViewApplicantsClick} className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 md:p-4 border border-white/10 cursor-pointer hover:bg-white/20 transition-colors relative">
              <div className="flex items-center gap-2 mb-2 text-white/80">
                <FileText size={14} className="stroke-[2.5]" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  {language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants"}
                </span>
                {pendingApplicantsCount > 0 && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
              </div>
              <p className="text-2xl md:text-3xl font-black">{pendingApplicantsCount}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 md:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-white/80">
                <Eye size={14} className="stroke-[2.5]" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  {language === 'uz' ? "Ko'rishlar" : language === 'ru' ? "Просмотры" : "Views"}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-black">{totalViews}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 md:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-white/80">
                <Activity size={14} className="stroke-[2.5]" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
                  {language === 'uz' ? "To'ldirilish" : language === 'ru' ? "Заполняемость" : "Fill Rate"}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-black">{avgFillRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 flex flex-col gap-6">
        {/* Action Button */}
        <button
          onClick={onPostJobClick}
          className="w-full md:w-auto md:self-start py-3.5 px-6 bg-brand-primary hover:bg-brand-primary/95 text-white font-display font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer outline-none"
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-black text-slate-800">
              {language === 'uz' ? "Ishlar ro'yxati" : language === 'ru' ? "Список работ" : "Jobs List"}
            </h2>
            <button 
              onClick={onViewAllJobsClick}
              className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline cursor-pointer outline-none"
            >
              {language === 'uz' ? "Barchasi" : language === 'ru' ? "Все" : "All"}
              <ChevronRight size={14} className="stroke-[2.5]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postedJobs.slice(0, 3).map(job => (
              <motion.div
                key={job.id}
                layout
                className={`bg-white border rounded-2xl shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer ${
                  job.status === 'completed' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'
                }`}
                onClick={onViewAllJobsClick}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-extrabold text-sm text-slate-800 line-clamp-2 leading-snug">
                      {job.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold mt-2">
                    <span className="text-brand-primary font-black">{job.salary}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium mt-1.5">
                    <MapPin size={11} className="stroke-[2.5]" /> 
                    <span className="truncate">{job.location}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3.5 border-t border-slate-100/60 flex items-center justify-between">
                  {job.status === 'completed' ? (
                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-brand-primary text-[10px] font-bold">
                      {language === 'uz' ? "Faol" : language === 'ru' ? "Активно" : "Active"}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Users size={12} /> 0/1
                  </span>
                </div>
              </motion.div>
            ))}
            
            {postedJobs.length === 0 && (
              <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Briefcase size={32} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">
                  {language === 'uz' ? "Ishlar topilmadi" : language === 'ru' ? "Нет работ" : "No jobs found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
