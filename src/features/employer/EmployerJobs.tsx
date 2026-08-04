import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Plus, Briefcase, History, MapPin, CheckCircle2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';

interface EmployerJobsProps {
  onPostJobClick: () => void;
}

export const EmployerJobs: React.FC<EmployerJobsProps> = ({ onPostJobClick }) => {
  const { postedJobs, language, completeJob, deleteJob } = useEmployer();
  
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const activeJobs = postedJobs.filter(j => j.status !== 'completed');
  const historyJobs = postedJobs.filter(j => j.status === 'completed');

  const displayJobs = activeTab === 'active' ? activeJobs : historyJobs;

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? "Ish boshqaruvi" : language === 'ru' ? "Управление работами" : "Job management"}
        description={language === 'uz' ? "Barcha e'lonlaringizni shu yerdan boshqaring" : language === 'ru' ? "Управляйте всеми своими объявлениями здесь" : "Manage all your job posts here"}
        language={language}
        onPostJobClick={onPostJobClick}
      />

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl w-full max-w-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none ${
            activeTab === 'active' 
              ? 'bg-white text-brand-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Briefcase size={14} className="stroke-[2.5]" />
          <span>{language === 'uz' ? "Faol ishlar" : language === 'ru' ? "Активные" : "Active Jobs"}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'active' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200 text-slate-500'}`}>
            {activeJobs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none ${
            activeTab === 'history' 
              ? 'bg-white text-brand-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <History size={14} className="stroke-[2.5]" />
          <span>{language === 'uz' ? "Tarix" : language === 'ru' ? "История" : "History"}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'history' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200 text-slate-500'}`}>
            {historyJobs.length}
          </span>
        </button>
      </div>

      {/* Job Grid */}
      {displayJobs.length === 0 ? (
        <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200/60 py-16 px-6 flex flex-col items-center justify-center text-center mt-4">
          {activeTab === 'active' ? (
            <Briefcase size={40} className="text-slate-300 stroke-[1.5] mb-4" />
          ) : (
            <History size={40} className="text-slate-300 stroke-[1.5] mb-4" />
          )}
          <p className="text-sm font-extrabold text-slate-600">
            {activeTab === 'active' 
              ? (language === 'uz' ? "Faol ishlar yo'q" : language === 'ru' ? "Нет активных работ" : "No active jobs")
              : (language === 'uz' ? "Tarix bo'sh" : language === 'ru' ? "История пуста" : "History is empty")
            }
          </p>
          <p className="text-[11px] text-slate-400 font-medium max-w-[260px] mt-2 leading-relaxed">
            {activeTab === 'active'
              ? (language === 'uz' ? "Hozircha hech qanday faol e'loningiz yo'q. Yangi ish yarating." : language === 'ru' ? "У вас пока нет активных объявлений. Создайте новую работу." : "You have no active jobs yet. Post a new job.")
              : (language === 'uz' ? "Yakunlangan ishlaringiz shu yerda ko'rinadi." : language === 'ru' ? "Завершенные работы будут отображаться здесь." : "Completed jobs will appear here.")
            }
          </p>
          {activeTab === 'active' && (
            <button
              onClick={onPostJobClick}
              className="mt-5 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all cursor-pointer"
            >
              {language === 'uz' ? "Birinchi e'lonni yaratish" : language === 'ru' ? "Создать первое объявление" : "Create first job post"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
          {displayJobs.map(job => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-2xl shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative ${
                job.status === 'completed' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-extrabold text-sm text-slate-800 line-clamp-2 leading-snug pr-6">
                    {job.title}
                  </h3>
                  {job.status === 'open' && (
                    <button 
                      onClick={() => deleteJob(job.id)}
                      className="absolute top-4 right-3 p-1 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer outline-none"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-2.5">
                  <span className="text-brand-primary font-black">{job.salary}</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mt-2">
                  <MapPin size={12} className="stroke-[2.5]" /> 
                  <span className="truncate">{job.location}</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {(job.tags || []).slice(0, 3).map((tag, tIdx) => (
                    <span key={tIdx} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold rounded-md">
                      {tag}
                    </span>
                  ))}
                  {(job.tags || []).length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold rounded-md">
                      +{(job.tags || []).length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-5 pt-3.5 border-t border-slate-100/60 flex items-center justify-between">
                {job.status === 'completed' ? (
                  <span className="px-2 py-1 rounded-md bg-emerald-100/60 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {language === 'uz' ? "Yopildi" : language === 'ru' ? "Завершено" : "Closed"}
                  </span>
                ) : job.status === 'in_progress' ? (
                  <button 
                    onClick={() => completeJob(job.id)}
                    className="px-3 py-1.5 rounded-md bg-brand-primary text-white text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    {language === 'uz' ? "Yakunlash va pulni o'tkazish" : "Завершить и перевести"}
                  </button>
                ) : (
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {language === 'uz' ? "Ochiq (Arizalar kutilyapti)" : "Открыто"}
                  </span>
                )}
                
                <button onClick={() => {
                  window.dispatchEvent(new CustomEvent("global-toast", { detail: language === 'uz' ? `E'lon ID: ${job.id} bo'yicha ${(job as any).candidatesCount || 0} ta nomzod topshirgan` : `По вакансии ID: ${job.id} подано ${(job as any).candidatesCount || 0} заявок` }));
                }} className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer outline-none">
                  {language === 'uz' ? "Batafsil" : language === 'ru' ? "Подробнее" : "Details"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
