import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, CheckCircle2, Trash2, Users, Calendar, Wallet, Hourglass, XCircle } from 'lucide-react';
import { Job } from '../../types';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { workDateSummary } from '../../utils/workDates';
import { getJobTitle, getJobLocation } from '../../utils/jobTranslationUtils';

interface EmployerJobCardProps {
  job: Job;
  language: 'uz' | 'ru' | 'en';
  onSelect: (job: Job) => void;
  onComplete: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onConfirmStart?: (jobId: string) => void;
  /* Settlement. Optional so the card still renders on screens that have no
     invoice flow behind them - the dashboard shows these same cards. */
  onPayInvoice?: (job: Job) => void;
}

export const getJobBannerImage = (job: Job): string => {
  if (job.imageUrl) return job.imageUrl;
  if (job.logoUrl) return job.logoUrl;
  const t = job.title.toLowerCase();
  if (t.includes('auto') || t.includes('usta') || t.includes('servis')) {
    return 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('qadoq') || t.includes('saralovchi') || t.includes('ombor')) {
    return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('kassir') || t.includes('sotuvchi') || t.includes('magazin')) {
    return 'https://images.unsplash.com/photo-1556742049-0a67568d049f?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=80';
};

export const EmployerJobCard: React.FC<EmployerJobCardProps> = ({
  job,
  language,
  onSelect,
  onComplete,
  onDelete,
  onConfirmStart,
  onPayInvoice,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hired = Number(job.hiredCount ?? 0);
  const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
  const bannerUrl = getJobBannerImage(job);
  const dates = workDateSummary(job.workDate, language);

  const localizedTitle = getJobTitle(job, language);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(job)}
      className="bg-white rounded-2xl p-5 flex flex-col h-full shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 group cursor-pointer relative"
    >
      {/* Top Section: Image & Basic Info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Thumbnail Image */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={bannerUrl}
            alt={localizedTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
           onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              title={localizedTitle}
              className="font-black text-base text-slate-800 line-clamp-2 leading-snug break-words min-w-0"
            >
              {localizedTitle}
            </h3>
            {/* Delete Button */}
            {job.status === 'open' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="w-7 h-7 shrink-0 rounded-full bg-slate-50 hover:bg-rose-50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          
          <div className="text-[19px] font-black text-brand-primary mb-2.5 leading-none truncate">
            {job.salary}
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
              <MapPin size={15} className="shrink-0" strokeWidth={2.5} />
              <span
                title={getJobLocation(job, language)}
                className="text-[13px] font-semibold truncate"
              >
                {getJobLocation(job, language)}
              </span>
            </div>
            {dates && (
              <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                <Calendar size={15} className="shrink-0" strokeWidth={2.5} />
                {/* One line, always. The whole list used to sit here and wrap
                    onto three, which is what left the icon stranded in the
                    middle of the block and the cards uneven. */}
                <span title={dates.full} className="text-[13px] font-semibold truncate">
                  {dates.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {/* `mt-auto` keeps this on the floor of the card. The cards in a row are
          the same height, so on a posting with less to say the action row used
          to stop halfway up and leave a hole beneath it. */}
      <div className="flex items-center justify-between gap-3 pt-3.5 mt-auto border-t border-slate-100">
        {/* Status Button / Pill */}
        <div className="flex-1 min-w-0">
          {/* Settlement is checked before job.status, because a job can be
              finished and still owe money - "Yopildi" over an unpaid invoice
              would be the wrong thing to say. */}
          {job.payoutStatus === 'invoiced' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPayInvoice?.(job);
              }}
              disabled={!onPayInvoice}
              className="w-full min-w-0 h-11 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-[12px] font-black transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Wallet size={14} className="stroke-[2.5]" />
              <span className="truncate">
                {language === 'uz' ? "To'lov qilish" : language === 'ru' ? "Оплатить" : "Pay invoice"}
              </span>
            </button>
          ) : job.payoutStatus === 'payment_declared' ? (
            <span className="w-full min-w-0 h-11 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <Hourglass size={14} />
              <span className="truncate">
                {language === 'uz' ? "Tasdiqlanishi kutilmoqda" : language === 'ru' ? "Ожидает подтверждения" : "Awaiting confirmation"}
              </span>
            </span>
          ) : job.payoutStatus === 'payment_confirmed' ? (
            <span className="w-full min-w-0 h-11 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              <span className="truncate">
                {language === 'uz' ? "To'lov tasdiqlandi" : language === 'ru' ? "Оплата подтверждена" : "Payment confirmed"}
              </span>
            </span>
          ) : job.status === 'cancelled' ? (
            /* There was no branch for this, so a cancelled posting fell through
               to "Kutilyapti" and claimed on the dashboard to be waiting for a
               worker while the jobs screen counted it, correctly, as history. */
            <span className="w-full min-w-0 h-11 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <XCircle size={14} />
              <span className="truncate">
                {language === 'uz' ? "Bekor qilindi" : language === 'ru' ? "Отменено" : "Cancelled"}
              </span>
            </span>
          ) : job.status === 'completed' ? (
            <span className="w-full min-w-0 h-11 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              <span className="truncate">
                {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
              </span>
            </span>
          ) : job.status === 'in_progress' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(job.id);
              }}
              className="w-full min-w-0 h-11 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-[12px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span className="truncate">
                {language === 'uz' ? "Yakunlash" : language === 'ru' ? "Завершить" : "Complete"}
              </span>
            </button>
          ) : job.status === 'start_requested' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onConfirmStart) onConfirmStart(job.id);
              }}
              className="w-full min-w-0 h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span className="truncate">
                {language === 'uz' ? "Tasdiqlash" : language === 'ru' ? "Подтвердить" : "Confirm"}
              </span>
            </button>
          ) : job.status === 'confirmed' ? (
            <span className="w-full min-w-0 h-11 rounded-lg bg-brand-primary/10 text-brand-primary text-[12px] font-black flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              <span className="truncate">
                {language === 'uz' ? "Ishchi olindi" : language === 'ru' ? "Работник нанят" : "Worker Hired"}
              </span>
            </span>
          ) : (
            <span className="w-full min-w-0 h-11 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="truncate">
                {language === 'uz' ? "Kutilyapti" : language === 'ru' ? "Ожидание" : "Waiting"}
              </span>
            </span>
          )}
        </div>

        {/* Workers Counter */}
        <div className="flex items-center gap-1.5 h-11 px-3.5 shrink-0 bg-slate-50 rounded-lg">
          <Users size={15} className="text-slate-400" />
          <span className="text-[13px] font-black text-slate-700 tabular-nums">{hired}/{vac}</span>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={language === 'uz' ? "O'chirishni tasdiqlash" : language === 'ru' ? "Подтвердите удаление" : "Confirm deletion"}
        message={language === 'uz' ? "Rostdan ham ushbu e'lonni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi." : language === 'ru' ? "Вы действительно хотите удалить эту вакансию? Это действие нельзя отменить." : "Are you sure you want to delete this job? This action cannot be undone."}
        confirmText={language === 'uz' ? "O'chirish" : language === 'ru' ? "Удалить" : "Delete"}
        cancelText={language === 'uz' ? "Bekor qilish" : language === 'ru' ? "Отмена" : "Cancel"}
        onConfirm={() => onDelete(job.id)}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
};
