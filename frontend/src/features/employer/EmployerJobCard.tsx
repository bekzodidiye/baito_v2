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
      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-brand-primary/40 hover:shadow-xl transition-all duration-200 group cursor-pointer relative"
    >
      {/* Image Banner */}
      <div className="relative h-36 w-full overflow-hidden bg-slate-100">
        <img
          src={bannerUrl}
          alt={job.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

        {/* Company Pill */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-white bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
            <Sparkles size={10} className="text-amber-300" />
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
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/50 hover:bg-rose-600 text-white backdrop-blur-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Title over banner gradient */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <h3 className="font-display font-black text-sm text-white line-clamp-1 leading-snug drop-shadow-sm">
            {job.title}
          </h3>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Salary */}
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-600 tracking-tight">
              {job.salary}
            </span>
          </div>

          {/* Location & Date Info */}
          <div className="mt-2 space-y-1 text-slate-500 text-[11px] font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-slate-400 shrink-0 stroke-[2]" />
              <span className="truncate">{job.rawLocation || job.location}</span>
            </div>
            {job.workDate && (
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-400 shrink-0 stroke-[2]" />
                <span>{job.workDate}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {(job.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {(job.tags || []).slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md border border-slate-200/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Status Pill */}
          {job.status === 'completed' ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 size={12} />
              {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
            </span>
          ) : job.status === 'in_progress' || job.status === 'start_requested' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(job.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 size={12} />
              {language === 'uz' ? "Yakunlash" : language === 'ru' ? "Завершить" : "Complete"}
            </button>
          ) : job.status === 'confirmed' ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 size={12} />
              {language === 'uz' ? "Ishchi olindi" : language === 'ru' ? "Работник нанят" : "Worker Hired"}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {language === 'uz' ? "Arizalar kutilyapti" : "Прием заявок"}
            </span>
          )}

          {/* Workers Counter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 flex items-center gap-1">
              <Users size={11} className="text-brand-primary" /> {hired}/{vac}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
