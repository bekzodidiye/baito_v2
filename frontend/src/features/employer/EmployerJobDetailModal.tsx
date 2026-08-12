import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Users, Calendar, MapPin, CheckCircle2, Trash2, PhoneCall, ChevronRight, Truck, Zap } from 'lucide-react';
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

  // Fallbacks for data that might not be in the Job type directly
  const category = (job as any).category || 'Savdo & Kassirlik';
  const company = job.company || 'Korzinka';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-[24px] sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[96vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative"
        >
            {/* Top White Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose} 
                className="text-slate-900 hover:text-brand-primary transition-colors cursor-pointer w-8 h-8 flex items-center justify-center -ml-2"
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <h2 className="text-[17px] font-bold text-slate-900">
                {language === 'uz' ? 'Ish tafsilotlari' : language === 'ru' ? 'Детали работы' : 'Job details'}
              </h2>
            </div>
            {/* Action buttons removed as requested */}
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 relative pb-24">
            
            {/* Image Banner */}
            <div className="w-full h-[240px] relative shrink-0 bg-slate-900">
              <img
                src={bannerUrl}
                alt={job.title}
                className="w-full h-full object-cover opacity-95"
                loading="lazy"
              />
              
              {/* Top-left Badge (like "12 soat qoldi") */}
              {job.status === 'in_progress' ? (
                <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-[13px] shadow-sm">
                  <Clock size={16} strokeWidth={2.5} />
                  <span>Jarayonda</span>
                </div>
              ) : (
                <div className="absolute top-4 left-4 bg-[#FF004D] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-[13px] shadow-sm">
                  <Clock size={16} strokeWidth={2.5} />
                  <span>12 soat qoldi</span>
                </div>
              )}
            </div>

            {/* Body Content Overlapping Image */}
            <div className="bg-white relative z-20 rounded-t-[24px] -mt-6 px-5 pt-6 pb-8 min-h-[400px]">
              
              {/* Category & Company */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[13px] font-bold border border-emerald-100/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {category}
                </div>
                <span className="text-slate-300 mx-1">•</span>
                <span className="text-slate-400 font-bold text-[14px]">{company}</span>
              </div>

              {/* Job Title */}
              <h1 className="text-[22px] font-black text-[#1A1A40] mb-4 leading-tight">{job.title}</h1>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="bg-[#E5F9ED] text-[#00B85E] px-3 py-1.5 rounded-lg text-[13px] font-bold">
                  12 soat muddatgacha
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1.5 border border-indigo-100/50">
                  <Users size={16} strokeWidth={2.5} /> {language === 'uz' ? 'Ishchilar:' : 'Workers:'} {hired}/{vac}
                </div>
                <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[13px] font-bold">
                  #Tezkor
                </div>
                <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[13px] font-bold">
                  #KunlikTo'lov
                </div>
              </div>

              {/* 2x2 Grid Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Date */}
                <div className="p-3.5 border border-slate-200/80 rounded-[16px] flex flex-col gap-1.5 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={18} strokeWidth={2.2} />
                    <span className="text-[13px] font-semibold">{language === 'uz' ? 'Sana' : 'Дата'}</span>
                  </div>
                  <div className="text-[15px] font-black text-[#1A1A40]">{job.workDate || '2026-08-22'}</div>
                </div>
                
                {/* Time */}
                <div className="p-3.5 border border-slate-200/80 rounded-[16px] flex flex-col gap-1.5 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={18} strokeWidth={2.2} />
                    <span className="text-[13px] font-semibold">{language === 'uz' ? 'Vaqt' : 'Время'}</span>
                  </div>
                  <div className="text-[15px] font-black text-[#1A1A40]">
                    {(job as any).startTime || '09:00'} - {(job as any).endTime || '18:00'}
                  </div>
                </div>

                {/* Salary */}
                <div className="p-3.5 border border-slate-200/80 rounded-[16px] flex flex-col gap-1.5 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-lg leading-none font-bold">$</span>
                    <span className="text-[13px] font-semibold">{language === 'uz' ? 'Maosh' : 'Зарплата'}</span>
                  </div>
                  <div className="text-[15px] font-black text-[#1A1A40]">{job.salary}</div>
                </div>

                {/* Hourly or type */}
                <div className="p-3.5 border border-slate-200/80 rounded-[16px] flex flex-col gap-1.5 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Zap size={18} strokeWidth={2.2} />
                    <span className="text-[13px] font-semibold">{language === 'uz' ? 'Soatlik' : 'Почасовая'}</span>
                  </div>
                  <div className="text-[15px] font-black text-[#1A1A40]">
                    {job.salary}
                  </div>
                </div>
              </div>

              {/* Transport */}
              <div className="p-4 border border-slate-200/80 rounded-[16px] flex items-center justify-between bg-slate-50 mb-6">
                <div className="flex items-center gap-2.5 text-[#1A1A40] font-semibold text-[14px]">
                  <Truck size={20} strokeWidth={2.2} /> 
                  {language === 'uz' ? 'Transport xarajati' : 'Транспорт'}
                </div>
                <div className="font-black text-[#1A1A40]">Yo'q</div>
              </div>

              {/* Location */}
              <div className="p-4 border border-slate-200/80 rounded-[16px] flex items-center gap-3 bg-white mb-8">
                 <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <MapPin size={20} className="text-orange-500" strokeWidth={2.2} />
                 </div>
                 <div className="min-w-0">
                    <span className="text-[12px] font-semibold text-slate-400 block mb-0.5">
                      {language === 'uz' ? 'Joylashuv' : 'Локация'}
                    </span>
                    <span className="text-[14px] font-bold text-[#1A1A40] truncate block">
                      {job.rawLocation || job.location}
                    </span>
                 </div>
              </div>

              {/* Accepted Workers */}
              {(job.hiredWorkers || []).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[17px] font-black text-[#1A1A40] mb-4">
                    {language === 'uz' ? 'Qabul qilingan ishchilar' : 'Принятые работники'}
                  </h3>
                  <div className="space-y-3">
                    {job.hiredWorkers!.map((worker) => (
                      <div key={worker.id} className="flex items-center justify-between p-4 bg-white border border-slate-200/80 shadow-sm rounded-[16px]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-lg shrink-0 overflow-hidden">
                            {worker.avatarUrl ? (
                              <img src={worker.avatarUrl} alt={worker.name} className="w-full h-full object-cover" />
                            ) : (
                              worker.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h5 className="font-bold text-[#1A1A40] text-[15px]">{worker.name}</h5>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              <div className="mb-8">
                <h3 className="text-[17px] font-black text-[#1A1A40] mb-4">
                  {language === 'uz' ? 'Vazifalar' : 'Обязанности'}
                </h3>
                <div className="bg-white p-5 rounded-[16px] border border-slate-200/80 shadow-sm">
                  <ul className="space-y-4">
                    {tasks.map((task, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-brand-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="text-slate-700 font-semibold text-[14px] leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-[17px] font-black text-[#1A1A40] mb-4">
                  {language === 'uz' ? 'Talablar' : 'Требования'}
                </h3>
                <div className="bg-white p-5 rounded-[16px] border border-slate-200/80 shadow-sm">
                  <ul className="space-y-4">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-2 shrink-0"></div>
                        <span className="text-slate-700 font-semibold text-[14px] leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/90 backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              {job.status === 'open' && onDelete ? (
                <>
                  <button
                    onClick={() => { 
                      const confirmMsg = language === 'uz' ? "Rostdan ham ushbu e'lonni o'chirmoqchimisiz?" : language === 'ru' ? "Вы действительно хотите удалить эту вакансию?" : "Are you sure you want to delete this job?";
                      if (window.confirm(confirmMsg)) {
                        onDelete(job.id); 
                        onClose(); 
                      }
                    }}
                    className="flex-1 py-4 px-4 bg-rose-50 text-rose-600 font-bold rounded-xl text-[15px] flex items-center justify-center gap-2 cursor-pointer border border-rose-100 active:scale-[0.98] transition-all"
                  >
                    <Trash2 size={20} />
                    <span>{language === 'uz' ? "O'chirish" : 'Удалить'}</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 font-bold rounded-xl text-[15px] cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {language === 'uz' ? 'Yopish' : 'Закрыть'}
                  </button>
                </>
              ) : job.status === 'in_progress' && onComplete ? (
                <>
                  <button
                    onClick={onClose}
                    className="w-1/3 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-[15px] cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {language === 'uz' ? 'Yopish' : 'Закрыть'}
                  </button>
                  <button
                    onClick={() => { onComplete(job.id); onClose(); }}
                    className="w-2/3 py-4 bg-brand-primary text-white font-black rounded-xl text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {language === 'uz' ? 'Ishni yakunlash' : 'Завершить работу'}
                    <ChevronRight size={20} />
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-[15px] cursor-pointer active:scale-[0.98] transition-all"
                >
                  {language === 'uz' ? 'Yopish' : 'Закрыть'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
