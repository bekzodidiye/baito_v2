import React from 'react';
import { Briefcase, FileText, Eye, Activity } from 'lucide-react';
import { Language } from '../../translations';

interface EmployerStatsBannerProps {
  language: Language;
  activeJobsCount: number;
  pendingApplicantsCount: number;
  totalViews: number;
  avgFillRate: number;
  onViewAllJobsClick: () => void;
  onViewApplicantsClick: () => void;
  onPostJobClick: () => void;
  onViewAnalyticsClick: () => void;
}

export const EmployerStatsBanner: React.FC<EmployerStatsBannerProps> = ({
  language,
  activeJobsCount,
  pendingApplicantsCount,
  totalViews,
  avgFillRate,
  onViewAnalyticsClick,
  onViewAllJobsClick,
  onViewApplicantsClick,
  onPostJobClick
}) => {
  return (
    <div className="bg-gradient-to-br from-brand-primary to-brand-primary-container md:rounded-[32px] rounded-b-[24px] px-4 md:px-8 pt-6 pb-8 relative overflow-hidden text-white shadow-lg">
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute left-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-black">
              {language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard"}
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

        <button
          onClick={onPostJobClick}
          className="mt-6 w-full py-4 bg-white text-brand-primary hover:bg-slate-50 font-display font-black text-[15px] rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          {language === 'uz' ? "Yangi ish yaratish" : language === 'ru' ? "Создать объявление" : "Post new job"}
        </button>
      </div>
    </div>
  );
};
