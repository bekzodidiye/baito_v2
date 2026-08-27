import React from 'react';
import { Briefcase, FileText, Eye, Activity, Plus } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-[#0a0f25] via-brand-primary to-[#1a235c] md:rounded-[32px] rounded-b-[24px] px-4 md:px-8 pt-8 pb-10 relative overflow-hidden text-white shadow-2xl">
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-accent/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-blue-400/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight">
              {language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard"}
            </h1>
            <p className="text-white/60 text-xs md:text-sm font-medium mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'uz' ? "Umumiy statistika va faol e'lonlar" : language === 'ru' ? "Общая статистика и активные объявления" : "General statistics and active jobs"}
            </p>
          </div>
          <button 
            onClick={onViewAnalyticsClick}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white text-xs font-bold transition-all active:scale-95 cursor-pointer border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center gap-2"
          >
            <Activity size={14} className="stroke-[2.5]" />
            {language === 'uz' ? "Statistika" : "Аналитика"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {/* Card 1 */}
          <div onClick={onViewAllJobsClick} className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 cursor-pointer hover:border-white/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <div className="flex flex-col gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                <Briefcase size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black tracking-tight">{activeJobsCount}</p>
                <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-wider mt-1 block">
                  {language === 'uz' ? "Faol ishlar" : language === 'ru' ? "Активные" : "Active Jobs"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div onClick={onViewApplicantsClick} className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 cursor-pointer hover:border-white/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            {pendingApplicantsCount > 0 && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-brand-primary"></span>
              </span>
            )}
            <div className="flex flex-col gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                <FileText size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black tracking-tight">{pendingApplicantsCount}</p>
                <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-wider mt-1 block">
                  {language === 'uz' ? "Yangi arizalar" : language === 'ru' ? "Новые заявки" : "New Applicants"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <div className="flex flex-col gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                <Eye size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black tracking-tight">{totalViews}</p>
                <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-wider mt-1 block">
                  {language === 'uz' ? "Ko'rishlar" : language === 'ru' ? "Просмотры" : "Views"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <div className="flex flex-col gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/90">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black tracking-tight">{avgFillRate}%</p>
                <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-wider mt-1 block">
                  {language === 'uz' ? "To'ldirilish" : language === 'ru' ? "Заполняемость" : "Fill Rate"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onPostJobClick}
          className="mt-8 w-full py-4.5 bg-white text-brand-primary hover:bg-slate-50 hover:shadow-[0_12px_24px_rgba(255,255,255,0.2)] font-display font-black text-[15px] rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={16} className="stroke-[3]" />
          </div>
          {language === 'uz' ? "Yangi ish yaratish" : language === 'ru' ? "Создать новую работу" : "Post a new job"}
        </button>
      </div>
    </div>
  );
};
