import React from 'react';
import { motion } from 'motion/react';
import { MapPin, CheckCircle2, Trash2, Users, Calendar, Sparkles } from 'lucide-react';
import { Job } from '../../types';

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
  const hired = Number(job.hiredCount ?? 0);
  const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
  const bannerUrl = getJobBannerImage(job);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(job)}
      className="bg-white rounded-[24px] p-4 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 transition-all duration-300 group cursor-pointer"
    >
      {/* Image Banner */}
      <div className="relative h-[160px] w-full rounded-[16px] overflow-hidden bg-slate-100 shrink-0 mb-4">
        <img
          src={bannerUrl}
          alt={job.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />

        {/* Company Pill */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brand-primary bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm">
            <Sparkles size={12} className="text-brand-primary" />
            {job.company || 'Baito'}
          </span>
        </div>

        {/* Delete Button */}
        {job.status === 'open' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            title={language === 'uz' ? "O'chirish" : language === 'ru' ? "Удалить" : "Delete"}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-rose-500 hover:text-white text-slate-700 shadow-sm flex items-center justify-center transition-all cursor-pointer focus:outline-none"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Card Content Below Image */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-black text-[18px] text-[#1A1A40] line-clamp-2 leading-tight mb-2">
            {job.title}
          </h3>

          {/* Salary */}
          <div className="flex items-end gap-1.5 mb-4">
            <span className="text-[22px] font-black text-brand-primary leading-none">
              {job.salary}
            </span>
          </div>

          {/* Location & Date Info */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin size={16} className="text-brand-primary shrink-0" strokeWidth={2.5} />
              <span className="text-[14px] font-semibold truncate">{job.rawLocation || job.location}</span>
            </div>
            {job.workDate && (
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={16} className="text-brand-primary shrink-0" strokeWidth={2.5} />
                <span className="text-[14px] font-semibold">{job.workDate}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {(job.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {(job.tags || []).slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary text-[11px] font-bold rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Status Button / Pill */}
          <div className="flex-1">
            {job.status === 'completed' ? (
              <span className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} />
                {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
              </span>
            ) : job.status === 'in_progress' || job.status === 'start_requested' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(job.id);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-black shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                {language === 'uz' ? "Yakunlash" : language === 'ru' ? "Завершить" : "Complete"}
              </button>
            ) : job.status === 'confirmed' ? (
              <span className="w-full py-2.5 rounded-xl bg-brand-primary text-white text-[13px] font-black flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(0,6,102,0.3)]">
                <CheckCircle2 size={16} />
                {language === 'uz' ? "Ishchi olindi" : language === 'ru' ? "Работник нанят" : "Worker Hired"}
              </span>
            ) : (
              <span className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 text-[13px] font-bold flex items-center justify-center gap-1.5 border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {language === 'uz' ? "Kutilyapti" : "Ожидание"}
              </span>
            )}
          </div>

          {/* Workers Counter */}
          <div className="flex items-center justify-center shrink-0 w-[52px] h-[44px] bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex flex-col items-center justify-center">
              <Users size={14} className="text-slate-400 mb-0.5" />
              <span className="text-[11px] font-black text-slate-700 leading-none">{hired}/{vac}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
