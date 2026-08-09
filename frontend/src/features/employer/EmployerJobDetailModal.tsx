import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, Calendar, Users, CheckCircle2, Trash2, Sparkles, MessageSquare } from 'lucide-react';
import { Job } from '../../types';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { getJobBannerImage } from './EmployerJobCard';

interface EmployerJobDetailModalProps {
  job: Job | null;
  onClose: () => void;
  language: 'uz' | 'ru' | 'en';
  onComplete?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

export const EmployerJobDetailModal: React.FC<EmployerJobDetailModalProps> = ({
  job,
  onClose,
  language,
  onComplete,
  onDelete,
}) => {
  if (!job) return null;

  const fallback = getJobDetails(job.title, language);
  const tasks = job.responsibilities ? job.responsibilities.split('\n').filter(Boolean) : fallback.tasks;
  const requirements = job.requirements ? job.requirements.split('\n').filter(Boolean) : fallback.requirements;

  const hired = Number(job.hiredCount ?? 0);
  const vac = Number(job.vacancies ?? (job.neededWorkers ? parseInt(job.neededWorkers) : 1));
  const bannerUrl = getJobBannerImage(job);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden relative"
        >
          {/* Header Image Banner */}
          <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-900">
            <img
              src={bannerUrl}
              alt={job.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

            {/* Top Bar inside Banner */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-white bg-slate-900/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <Sparkles size={11} className="text-amber-300" />
                {job.company || 'Baito Company'}
              </span>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white/90 hover:text-white backdrop-blur-md transition-all cursor-pointer border border-white/20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bottom Title inside Banner */}
            <div className="absolute bottom-4 left-5 right-5 z-10">
              <h2 className="text-xl font-black text-white leading-tight drop-shadow-md">
                {job.title}
              </h2>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {language === 'uz' ? 'Ish haqi' : language === 'ru' ? 'Зарплата' : 'Salary'}
                </span>
                <span className="text-base font-black text-emerald-600">{job.salary}</span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {language === 'uz' ? 'Vakansiya / Qabul' : language === 'ru' ? 'Принято' : 'Hired'}
                </span>
                <span className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Users size={15} className="text-brand-primary stroke-[2.5]" /> {hired} / {vac}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {language === 'uz' ? 'Joylashuv' : language === 'ru' ? 'Локация' : 'Location'}
                </span>
                <span className="text-xs font-extrabold text-slate-700 truncate flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{job.rawLocation || job.location}</span>
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {language === 'uz' ? 'Sana / Vaqt' : language === 'ru' ? 'Дата / Время' : 'Date / Time'}
                </span>
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>{job.workDate || '2026-08-05'}</span>
                </span>
              </div>
            </div>

            {/* Tags */}
            {(job.tags || []).length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  {language === 'uz' ? 'Teglar:' : language === 'ru' ? 'Теги:' : 'Tags:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Workers */}
            {(job.hiredWorkers || []).length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  {language === 'uz' ? 'Qabul qilingan ishchilar:' : language === 'ru' ? 'Принятые работники:' : 'Hired Workers:'}
                </span>
                <div className="space-y-2">
                  {job.hiredWorkers!.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                          {worker.avatarUrl ? (
                            <img src={worker.avatarUrl} alt={worker.name} className="w-full h-full object-cover" />
                          ) : (
                            worker.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{worker.name}</h5>
                          {worker.phone && <p className="text-xs text-slate-500 font-medium">{worker.phone}</p>}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* TODO: open chat */ }} 
                        className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-brand-primary hover:bg-indigo-50 transition-colors shrink-0"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-xs mb-2">
                {language === 'uz' ? 'Vazifalar:' : language === 'ru' ? 'Обязанности:' : 'Responsibilities:'}
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                {tasks.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[9px]">
                      ✓
                    </span>
                    <span className="leading-relaxed">{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-xs mb-2">
                {language === 'uz' ? 'Talablar:' : language === 'ru' ? 'Требования:' : 'Requirements:'}
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                {requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[9px]">
                      •
                    </span>
                    <span className="leading-relaxed">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            {job.status === 'in_progress' && onComplete && (
              <button
                onClick={() => { onComplete(job.id); onClose(); }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 size={15} />
                {language === 'uz' ? 'Ishni yakunlash' : language === 'ru' ? 'Завершить работу' : 'Complete job'}
              </button>
            )}

            {job.status === 'open' && onDelete && (
              <button
                onClick={() => { onDelete(job.id); onClose(); }}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                {language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}
              </button>
            )}

            <button
              onClick={onClose}
              className="py-2.5 px-5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-xs transition-all cursor-pointer ml-auto"
            >
              {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
