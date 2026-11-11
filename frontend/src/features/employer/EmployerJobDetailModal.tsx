import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  X,
  Clock,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Zap,
  Building2,
  Wallet,
  Share2,
  Phone,
} from 'lucide-react';
import { Job } from '../../types';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { getJobLocalizedFields } from '../../utils/jobTranslationUtils';
import { getJobCategory } from '../../utils/jobCategoryUtils';
import { formatSalary } from '../../utils/money';
import { getJobShiftTime, getJobDateDisplay, getJobDuration } from '../../utils/jobTimeUtils';
import { shareJob } from '../../utils/shareJob';
import { getJobBannerImage } from './EmployerJobCard';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface EmployerJobDetailModalProps {
  job: Job | null;
  onClose: () => void;
  language: 'uz' | 'ru' | 'en';
  onComplete?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onConfirmStart?: (jobId: string) => void;
}

export const EmployerJobDetailModal: React.FC<EmployerJobDetailModalProps> = ({
  job,
  onClose,
  language,
  onComplete,
  onDelete,
  onConfirmStart,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!job) return null;

  const localized = getJobLocalizedFields(job, language);
  const fallback = getJobDetails(localized.title, language);
  const tasks = localized.responsibilities ? localized.responsibilities.split('\n').filter(Boolean) : fallback.tasks;
  const requirements = localized.requirements ? localized.requirements.split('\n').filter(Boolean) : fallback.requirements;

  const hired = Number(job.hiredCount ?? 0);
  const vac = Math.max(1, Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers, 10) : 1)));
  const progressPercent = Math.min(100, Math.round((hired / vac) * 100));

  const bannerUrl = getJobBannerImage(job);
  const catInfo = getJobCategory(job);
  const categoryLabel = language === 'ru' ? catInfo.nameRu : language === 'en' ? catInfo.nameEn : catInfo.nameUz;
  const company = job.company || 'Korzinka';

  const renderStatusBadge = () => {
    if (job.status === 'pending') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/95 backdrop-blur-md text-white text-xs font-bold shadow-md">
          <Clock size={14} strokeWidth={2.5} />
          <span>{language === 'ru' ? 'На модерации' : language === 'en' ? 'Pending approval' : 'Tasdiqlanishi kutilmoqda'}</span>
        </div>
      );
    }
    if (job.status === 'in_progress') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-xs font-bold shadow-md">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>{language === 'ru' ? 'В процессе' : language === 'en' ? 'In progress' : 'Jarayonda'}</span>
        </div>
      );
    }
    if (job.status === 'start_requested') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/95 backdrop-blur-md text-white text-xs font-bold shadow-md">
          <Clock size={14} strokeWidth={2.5} />
          <span>{language === 'ru' ? 'Ожидает начала' : language === 'en' ? 'Start requested' : "Boshlash so'ralgan"}</span>
        </div>
      );
    }
    if (job.status === 'completed') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/95 backdrop-blur-md text-white text-xs font-bold shadow-md">
          <CheckCircle2 size={14} strokeWidth={2.5} />
          <span>{language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Tugallangan'}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>{language === 'ru' ? 'Активно' : language === 'en' ? 'Active' : "Faol e'lon"}</span>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden relative border border-slate-100"
        >
          {/* Top Sticky Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100/90 z-20 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                aria-label="Back"
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 leading-tight">
                  {language === 'ru' ? 'Детали работы' : language === 'en' ? 'Job details' : 'Ish tafsilotlari'}
                </h2>
                <span className="text-[11px] font-medium text-slate-400 block leading-none mt-0.5">
                  ID: #{job.id ? job.id.slice(0, 8) : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => shareJob({ id: job.id, title: localized.title, company }, language)}
                title={language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Ulashish'}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Share2 size={16} strokeWidth={2.2} />
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/60 relative">
            {/* Image Banner */}
            <div className="w-full h-[200px] sm:h-[220px] relative shrink-0 bg-slate-950 overflow-hidden">
              <img
                src={bannerUrl}
                alt={job.title}
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=80';
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
              />

              {/* Gradient scrim for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-black/30 pointer-events-none" />

              {/* Status Badge (Top-left) */}
              <div className="absolute top-4 left-4 z-10">
                {renderStatusBadge()}
              </div>

              {/* Duration Pill (Top-right) */}
              <div className="absolute top-4 right-4 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/95 text-xs font-semibold border border-white/10 shadow-md">
                  <Clock size={13} strokeWidth={2.2} />
                  <span>{getJobDuration(job, language)}</span>
                </div>
              </div>
            </div>

            {/* Overlapping Content Container */}
            <div className="bg-white relative z-10 rounded-t-[26px] -mt-5 px-5 sm:px-6 pt-5 pb-8 shadow-sm">
              {/* Category & Company Header */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${catInfo.badgeBg} ${catInfo.badgeText} border ${catInfo.borderClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dotBg}`} />
                  {categoryLabel}
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs sm:text-sm">
                  <Building2 size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[180px]">{company}</span>
                </div>
              </div>

              {/* Job Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
                {localized.title}
              </h1>

              {/* Recruitment Progress Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100/80 mb-5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Users size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">
                        {language === 'ru' ? 'Набор персонала' : language === 'en' ? 'Staff recruitment' : 'Xodimlar qabuli'}
                      </span>
                      <span className="text-[14px] font-black text-slate-900">
                        {hired} / {vac} {language === 'ru' ? 'принято' : language === 'en' ? 'accepted' : 'qabul qilindi'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      hired >= vac
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {hired >= vac
                      ? (language === 'ru' ? 'Заполнено' : language === 'en' ? 'Filled' : "To'ldirildi")
                      : (language === 'ru' ? 'Идет набор' : language === 'en' ? 'Recruiting' : 'Qidirilmoqda')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hired >= vac ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.max(6, progressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Location Card */}
              <div className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 mb-4 flex items-start gap-3.5 hover:border-slate-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-400 block mb-0.5">
                    {language === 'ru' ? 'Локация' : language === 'en' ? 'Location' : 'Joylashuv'}
                  </span>
                  <span className="text-sm font-bold text-slate-900 block leading-snug">
                    {localized.location || job.rawLocation || job.location}
                  </span>
                  {job.addressDetails && (
                    <span className="text-xs text-slate-500 mt-1 block">
                      {job.addressDetails}
                    </span>
                  )}
                </div>
              </div>

              {/* 2x2 Bento Grid for Financials & Schedule */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Salary Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Wallet size={16} strokeWidth={2.2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {language === 'ru' ? 'Зарплата' : language === 'en' ? 'Salary' : 'Maosh'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 leading-tight">
                      {formatSalary(job.salary, language)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {language === 'ru' ? 'за смену' : language === 'en' ? 'per shift' : 'smena uchun'}
                    </span>
                  </div>
                </div>

                {/* Hourly Rate Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Zap size={16} strokeWidth={2.2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {language === 'ru' ? 'Почасовая' : language === 'en' ? 'Hourly' : 'Soatlik'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 leading-tight">
                      {job.hourlyRate
                        ? `${formatSalary(job.hourlyRate, language)} / ${language === 'ru' ? 'час' : language === 'en' ? 'hour' : 'soat'}`
                        : (language === 'ru' ? 'По договоренности' : language === 'en' ? 'Negotiable' : 'Kelishilgan')}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {language === 'ru' ? 'ставка' : language === 'en' ? 'rate' : 'stavka'}
                    </span>
                  </div>
                </div>

                {/* Work Date Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Calendar size={16} strokeWidth={2.2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {language === 'ru' ? 'Дата' : language === 'en' ? 'Date' : 'Sana'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 leading-tight">
                      {getJobDateDisplay(job)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {getJobDuration(job, language)}
                    </span>
                  </div>
                </div>

                {/* Work Time Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Clock size={16} strokeWidth={2.2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {language === 'ru' ? 'Время' : language === 'en' ? 'Time' : 'Vaqt'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 leading-tight">
                      {getJobShiftTime(job)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {language === 'ru' ? 'рабочее время' : language === 'en' ? 'working hours' : 'ish vaqti'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section (if present) */}
              {(localized.description || job.description) && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    {language === 'ru' ? 'Описание' : language === 'en' ? 'Description' : 'Tavsif'}
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                    {localized.description || job.description}
                  </div>
                </div>
              )}

              {/* Accepted Workers Section */}
              {(job.hiredWorkers || []).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'ru' ? 'Принятые работники' : language === 'en' ? 'Hired workers' : 'Qabul qilingan ishchilar'}
                    </h3>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {job.hiredWorkers!.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {job.hiredWorkers!.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300/80 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0 overflow-hidden">
                            {worker.avatarUrl ? (
                              <img
                                src={worker.avatarUrl}
                                alt={worker.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallback =
                                    'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                                  if (target.src !== fallback) {
                                    target.src = fallback;
                                  }
                                }}
                              />
                            ) : (
                              worker.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">{worker.name}</h5>
                            {worker.phone && (
                              <p className="text-xs text-slate-500 font-medium">{worker.phone}</p>
                            )}
                          </div>
                        </div>
                        {worker.phone && (
                          <a
                            href={`tel:${worker.phone}`}
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-600 flex items-center justify-center transition-colors shadow-xs"
                            title={language === 'ru' ? 'Позвонить' : language === 'en' ? 'Call' : "Qo'ng'iroq qilish"}
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              {tasks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'ru' ? 'Обязанности' : language === 'en' ? 'Responsibilities' : 'Vazifalar'}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70 space-y-3">
                    {tasks.map((task, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={13} strokeWidth={2.8} />
                        </div>
                        <span className="text-slate-800 font-medium text-sm leading-relaxed">
                          {task}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {requirements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'ru' ? 'Требования' : language === 'en' ? 'Requirements' : 'Talablar'}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {requirements.length}
                    </span>
                  </div>
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70 space-y-3">
                    {requirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span className="text-slate-800 font-medium text-sm leading-relaxed">
                          {req}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="shrink-0 p-4 sm:px-6 border-t border-slate-100 bg-white/95 backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              {(job.status === 'open' || job.status === 'pending') && onDelete ? (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-xs"
                  >
                    <Trash2 size={18} />
                    <span>{language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all shadow-sm flex items-center justify-center"
                  >
                    {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </>
              ) : job.status === 'start_requested' && onConfirmStart ? (
                <>
                  <button
                    onClick={onClose}
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                  <button
                    onClick={() => {
                      onConfirmStart(job.id);
                      onClose();
                    }}
                    className="w-2/3 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <span>{language === 'uz' ? 'Boshlashni tasdiqlash' : language === 'ru' ? 'Подтвердить начало' : 'Confirm start'}</span>
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all shadow-sm"
                >
                  {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={language === 'uz' ? "O'chirishni tasdiqlash" : language === 'ru' ? 'Подтвердите удаление' : 'Confirm deletion'}
        message={
          language === 'uz'
            ? "Rostdan ham ushbu e'lonni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
            : language === 'ru'
              ? 'Вы действительно хотите удалить эту вакансию? Это действие нельзя отменить.'
              : 'Are you sure you want to delete this job? This action cannot be undone.'
        }
        confirmText={language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}
        cancelText={language === 'uz' ? 'Bekor qilish' : language === 'ru' ? 'Отмена' : 'Cancel'}
        onConfirm={() => {
          onDelete?.(job.id);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AnimatePresence>
  );
};
