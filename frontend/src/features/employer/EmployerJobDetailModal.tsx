import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, Calendar, Users, CheckCircle2, Trash2, Sparkles, PhoneCall, ChevronRight, Briefcase } from 'lucide-react';
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
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative"
        >
          {/* Header Banner */}
          <div className="relative h-44 sm:h-52 w-full shrink-0 overflow-hidden bg-slate-900">
            <img
              src={bannerUrl}
              alt={job.title}
              className="w-full h-full object-cover opacity-80"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
            
            {/* Top Bar inside Banner */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-900 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
                  <Sparkles size={12} className="text-amber-500" />
                  {job.company || 'Baito Company'}
                </span>
                {job.status === 'in_progress' && (
                   <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-sm">
                     Jarayonda
                   </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all cursor-pointer border border-white/10"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Bottom Title inside Banner */}
            <div className="absolute bottom-4 left-5 right-5 z-10">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-lg">
                {job.title}
              </h2>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm bg-slate-50/50">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <span className="text-emerald-600 font-bold text-lg">💰</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {language === 'uz' ? 'Ish haqi' : language === 'ru' ? 'Зарплата' : 'Salary'}
                  </span>
                  <span className="text-sm font-black text-slate-900">{job.salary}</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {language === 'uz' ? 'Qabul' : language === 'ru' ? 'Принято' : 'Hired'}
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {hired} <span className="text-slate-400 font-semibold">/ {vac}</span>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-orange-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {language === 'uz' ? 'Joylashuv' : language === 'ru' ? 'Локация' : 'Location'}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {job.rawLocation || job.location}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-purple-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {language === 'uz' ? 'Sana / Vaqt' : language === 'ru' ? 'Дата / Время' : 'Date / Time'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {job.workDate || '2026-08-05'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {(job.tags || []).length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2.5 pl-1">
                  {language === 'uz' ? 'Teglar' : language === 'ru' ? 'Теги' : 'Tags'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-[11px] font-bold border border-slate-200/80 shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Workers */}
            {(job.hiredWorkers || []).length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2.5 pl-1">
                  {language === 'uz' ? 'Qabul qilingan ishchilar' : language === 'ru' ? 'Принятые работники' : 'Hired Workers'}
                </span>
                <div className="space-y-2">
                  {job.hiredWorkers!.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-sm shrink-0 overflow-hidden">
                          {worker.avatarUrl ? (
                            <img src={worker.avatarUrl} alt={worker.name} className="w-full h-full object-cover" />
                          ) : (
                            worker.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{worker.name}</h5>
                          {worker.phone && <p className="text-xs text-slate-500 font-semibold mt-0.5">{worker.phone}</p>}
                        </div>
                      </div>
                      <a 
                        href={`tel:${worker.phone || ''}`}
                        onClick={(e) => { e.stopPropagation(); }} 
                        className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors shrink-0 cursor-pointer"
                      >
                        <PhoneCall size={16} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2.5 pl-1">
                {language === 'uz' ? 'Vazifalar' : language === 'ru' ? 'Обязанности' : 'Responsibilities'}
              </span>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <ul className="space-y-3">
                  {tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-brand-primary shrink-0 mt-0.5" />
                      <span className="text-slate-700 font-medium text-sm leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2.5 pl-1">
                {language === 'uz' ? 'Talablar' : language === 'ru' ? 'Требования' : 'Requirements'}
              </span>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <ul className="space-y-3">
                  {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></div>
                      <span className="text-slate-700 font-medium text-sm leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Extra padding at the bottom for scroll breathing room */}
            <div className="h-4"></div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-3.5 px-6 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
            </button>
            
            <div className="flex-1 flex gap-3 w-full sm:w-auto">
              {job.status === 'open' && onDelete && (
                <button
                  onClick={() => { onDelete(job.id); onClose(); }}
                  className="w-full sm:w-auto py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-100"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">{language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}</span>
                </button>
              )}

              {job.status === 'in_progress' && onComplete && (
                <button
                  onClick={() => { onComplete(job.id); onClose(); }}
                  className="flex-1 py-3.5 px-6 bg-brand-primary hover:bg-blue-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-[0.98]"
                >
                  {language === 'uz' ? 'Ishni yakunlash' : language === 'ru' ? 'Завершить работу' : 'Complete job'}
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
