import React from 'react';
import { Calendar, Timer, DollarSign, Zap, Truck, Users } from 'lucide-react';
import { Job } from '../../types';
import { getJobDateDisplay, getJobShiftTime, getJobDuration } from '../../utils/jobTimeUtils';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsCardProps {
  selectedJob: Job;
}

export const JobDetailsCard: React.FC<JobDetailsCardProps> = ({ selectedJob }) => {
  const { language } = useApp();
  const t = translations[language];
  const category = getJobCategory(selectedJob);
  const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

  const getDisplayHourly = () => {
    if (selectedJob.hourlyRate && selectedJob.hourlyRate !== "Yo'q" && selectedJob.hourlyRate !== "Нет" && selectedJob.hourlyRate !== "No") {
      return selectedJob.hourlyRate;
    }
    return language === 'uz' ? "50 000 so'm" : language === 'ru' ? "50 000 сум" : "50,000 UZS";
  };

  const getDisplayTransport = () => {
    if (selectedJob.transportRate && selectedJob.transportRate !== "Yo'q" && selectedJob.transportRate !== "Нет" && selectedJob.transportRate !== "No" && !selectedJob.transportRate.includes('xarajat')) {
      return selectedJob.transportRate.includes("so'm") || selectedJob.transportRate.includes("сум") ? selectedJob.transportRate : `${selectedJob.transportRate} so'm`;
    }
    return selectedJob.transportRate || (language === 'uz' ? "15 000 so'm" : language === 'ru' ? "15 000 сум" : "15,000 UZS");
  };

  const durationBadge = selectedJob.durationLabel ? `${selectedJob.durationLabel} muddatgacha` : "12 soat muddatgacha";

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-4 shadow-sm border border-slate-200">
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${category.badgeBg} ${category.badgeText} inline-flex items-center gap-1.5 border ${category.borderClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${category.dotBg}`} />
            {categoryName}
          </span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-slate-400 font-bold text-xs truncate">{selectedJob.company}</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-brand-primary leading-snug">
          {selectedJob.title}
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
          {durationBadge}
        </span>
        <span className="bg-blue-50 text-brand-primary border border-blue-100/80 px-2.5 py-0.5 rounded-lg text-xs font-extrabold flex items-center gap-1">
          <Users size={13} className="text-brand-primary" /> {language === 'uz' ? "Ishchilar:" : language === 'ru' ? "Рабочие:" : "Workers:"} {selectedJob.hiredCount || 0}/{selectedJob.vacancies || (selectedJob.neededWorkers ? parseInt(selectedJob.neededWorkers) : 1)}
        </span>
        {selectedJob.tags && selectedJob.tags.slice(0, 2).map((tag, idx) => (
          <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
            {tag}
          </span>
        ))}
      </div>

      {/* 2x2 Bento Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Sana */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 mb-0.5 text-slate-500">
            <Calendar size={15} className="text-slate-500" />
            <span className="text-xs font-medium">{t.date || "Sana"}</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-brand-primary">
            {getJobDateDisplay(selectedJob)}
          </p>
        </div>

        {/* Vaqt */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 mb-0.5 text-slate-500">
            <Timer size={15} className="text-slate-500" />
            <span className="text-xs font-medium">{t.time || "Vaqt"}</span>
          </div>
          <p className="text-xs font-bold text-brand-primary truncate">
            {getJobShiftTime(selectedJob)}
          </p>
        </div>

        {/* Maosh */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 mb-0.5 text-slate-500">
            <DollarSign size={15} className="text-slate-500" />
            <span className="text-xs font-medium">{t.salary || "Maosh"}</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-brand-primary truncate">
            {selectedJob.salary}
          </p>
        </div>

        {/* Soatlik */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-1.5 mb-0.5 text-slate-500">
            <Zap size={15} className="text-slate-500" />
            <span className="text-xs font-medium">{t.hourly || "Soatlik"}</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-brand-primary truncate">
            {getDisplayHourly()}
          </p>
        </div>
      </div>

      {/* Transport xarajatlari */}
      <div className="mt-3 flex items-center justify-between p-2.5 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-brand-primary" />
          <span className="text-xs font-medium text-slate-800">{t.transportCost || "Transport xarajatlari"}</span>
        </div>
        <span className="font-bold text-brand-primary text-xs sm:text-sm">
          {getDisplayTransport()}
        </span>
      </div>
    </div>
  );
};
