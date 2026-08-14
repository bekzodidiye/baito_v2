import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, CheckCircle2, Trash2, Users, Calendar } from 'lucide-react';
import { Job } from '../../types';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface EmployerJobCardProps {
  job: Job;
  language: 'uz' | 'ru' | 'en';
  onSelect: (job: Job) => void;
  onComplete: (jobId: string) => void;
  onDelete: (jobId: string) => void;
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
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hired = Number(job.hiredCount ?? 0);
  const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
  const bannerUrl = getJobBannerImage(job);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(job)}
      className="bg-white rounded-2xl p-4 flex flex-col shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group cursor-pointer relative"
    >
      {/* Top Section: Image & Basic Info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Thumbnail Image */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={bannerUrl}
            alt={job.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-black text-[15px] text-slate-800 line-clamp-2 leading-tight">
              {job.title}
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
          
          <div className="text-[17px] font-black text-brand-primary mb-2 leading-none">
            {job.salary}
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin size={14} className="shrink-0" strokeWidth={2.5} />
              <span className="text-[12px] font-semibold truncate">{job.rawLocation || job.location}</span>
            </div>
            {job.workDate && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar size={14} className="shrink-0" strokeWidth={2.5} />
                <span className="text-[12px] font-semibold">{job.workDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {(job.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pl-24">
          {(job.tags || []).slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
        {/* Status Button / Pill */}
        <div className="flex-1">
          {job.status === 'completed' ? (
            <span className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
            </span>
          ) : job.status === 'in_progress' || job.status === 'start_requested' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(job.id);
              }}
              className="w-full py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-[12px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {language === 'uz' ? "Yakunlash" : language === 'ru' ? "Завершить" : "Complete"}
            </button>
          ) : job.status === 'confirmed' ? (
            <span className="w-full py-2 rounded-lg bg-brand-primary/10 text-brand-primary text-[12px] font-black flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} />
              {language === 'uz' ? "Ishchi olindi" : language === 'ru' ? "Работник нанят" : "Worker Hired"}
            </span>
          ) : (
            <span className="w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-bold flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {language === 'uz' ? "Kutilyapti" : "Ожидание"}
            </span>
          )}
        </div>

        {/* Workers Counter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg">
          <Users size={14} className="text-slate-400" />
          <span className="text-[12px] font-black text-slate-700">{hired}/{vac}</span>
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
