import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Briefcase, History } from 'lucide-react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { EmployerJobDetailModal } from './EmployerJobDetailModal';
import { EmployerJobCard } from './EmployerJobCard';
import { FinishJobModal } from './components/FinishJobModal';
import { Job } from '../../types';

interface EmployerJobsProps {
  onPostJobClick: () => void;
}

export const EmployerJobs: React.FC<EmployerJobsProps> = ({ onPostJobClick }) => {
  const { postedJobs, language, completeJob, deleteJob } = useEmployer();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null);

  const handleFinishConfirm = async (data: { rating: number; review: string; bonus: number }) => {
    if (jobToComplete) {
      await completeJob(jobToComplete.id, data);
      setJobToComplete(null);
    }
  };

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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
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
            <EmployerJobCard
              key={job.id}
              job={job}
              language={language}
              onSelect={setSelectedJob}
              onComplete={(id) => setJobToComplete(job)}
              onDelete={deleteJob}
            />
          ))}
        </div>
      )}

      {/* Detailed Modal */}
      <EmployerJobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        language={language}
        onComplete={(id) => {
          setSelectedJob(null);
          const j = postedJobs.find(x => x.id === id);
          if (j) setJobToComplete(j);
        }}
        onDelete={deleteJob}
      />

      {/* Finish Job Modal */}
      <FinishJobModal
        isOpen={!!jobToComplete}
        onClose={() => setJobToComplete(null)}
        onConfirm={handleFinishConfirm}
        jobTitle={jobToComplete?.title || ''}
        language={language}
      />
    </div>
  );
};
