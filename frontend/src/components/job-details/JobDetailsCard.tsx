import React from 'react';
import { Calendar, Timer, DollarSign, Zap, Truck, Users } from 'lucide-react';
import { Job } from '../../types';
import { getJobDateDisplay, getJobShiftTime } from '../../utils/jobTimeUtils';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { translations } from '../../translations';
import { formatSalary } from '../../utils/money';
import { getJobTitle } from '../../utils/jobTranslationUtils';
import { useAuthStore } from "../../store/useAuthStore";

interface JobDetailsCardProps {
  selectedJob: Job;
}

export const JobDetailsCard: React.FC<JobDetailsCardProps> = ({ selectedJob }) => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const category = getJobCategory(selectedJob);
  const categoryName = language === 'ru' ? category.nameRu : language === 'en' ? category.nameEn : category.nameUz;

  // A rate is stored with whatever currency word was on it when the posting
  // went up — "15000 UZS" from the employer form, "15 000 so'm" from older
  // ones. The old code appended "so'm" whenever it could not see one, which
  // produced "15000 UZS so'm", and appended the Uzbek word whoever was
  // reading. Take the currency off, keep the figure, and let the locale say it.
  const withCurrency = (raw: string | number, pattern: string) =>
    pattern.replace('{rate}', String(raw).replace(/\s*(so['\u2019]m|сум|UZS)\s*$/i, '').trim());

  // "Yo'q" / "Нет" / "No" are how the three locales spell an unset rate.
  const rateOrNull = (v?: string | number) =>
    !v || String(v) === "Yo'q" || String(v) === "Нет" || String(v) === "No" ? null : v;

  const getDisplayHourly = () =>
    withCurrency(rateOrNull(selectedJob.hourlyRate) ?? '50 000', t.hourlyVal);

  const getDisplayTransport = () => {
    const rate = rateOrNull(selectedJob.transportRate);
    return withCurrency(
      rate && !String(rate).includes('xarajat') ? rate : '15 000',
      t.transportRateVal,
    );
  };

  // t.deadlineText has been sitting in all three locale files unused; the badge
  // said "muddatgacha" to Russian and English readers alike.
  const durationBadge = t.deadlineText.replace(
    '{duration}',
    selectedJob.durationLabel || (language === 'uz' ? '12 soat' : language === 'ru' ? '12 часов' : '12 hours'),
  );

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
          {getJobTitle(selectedJob, language)}
        </h2>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
          {durationBadge}
        </span>
        <span className="bg-blue-50 text-brand-primary border border-blue-100/80 px-2.5 py-0.5 rounded-lg text-xs font-extrabold flex items-center gap-1">
          <Users size={13} className="text-brand-primary" /> {language === 'uz' ? "Ishchilar:" : language === 'ru' ? "Рабочие:" : "Workers:"} {selectedJob.hiredCount || 0}/{selectedJob.vacancies || (selectedJob.neededWorkers ? parseInt(selectedJob.neededWorkers) : 1)}
        </span>
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
            {formatSalary(selectedJob.salary, language)}
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
