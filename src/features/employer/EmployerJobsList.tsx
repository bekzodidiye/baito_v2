import React, { useState } from 'react';
import { ChevronRight, Briefcase } from 'lucide-react';
import { Language } from '../../translations';
import { EmployerJobCard } from './EmployerJobCard';
import { EmployerJobDetailModal } from './EmployerJobDetailModal';
import { useEmployer } from '../../hooks/useEmployer';
import { Job } from '../../types';

interface EmployerJobsListProps {
  language: Language;
  postedJobs: Job[];
  onViewAllJobsClick: () => void;
}

export const EmployerJobsList: React.FC<EmployerJobsListProps> = ({
  language,
  postedJobs,
  onViewAllJobsClick
}) => {
  const { completeJob, deleteJob } = useEmployer();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-black text-slate-800">
          {language === 'uz' ? "Ishlar ro'yxati" : language === 'ru' ? "Список работ" : "Jobs List"}
        </h2>
        <button 
          onClick={onViewAllJobsClick}
          className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline cursor-pointer outline-none"
        >
          {language === 'uz' ? "Barchasi" : language === 'ru' ? "Все" : "All"}
          <ChevronRight size={14} className="stroke-[2.5]" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {postedJobs.slice(0, 3).map(job => (
          <EmployerJobCard
            key={job.id}
            job={job}
            language={language as 'uz' | 'ru' | 'en'}
            onSelect={setSelectedJob}
            onComplete={completeJob}
            onDelete={deleteJob}
          />
        ))}
        
        {postedJobs.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <Briefcase size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-500">
              {language === 'uz' ? "Ishlar topilmadi" : language === 'ru' ? "Нет работ" : "No jobs found"}
            </p>
          </div>
        )}
      </div>

      {/* Modal detail */}
      <EmployerJobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        language={language as 'uz' | 'ru' | 'en'}
        onComplete={completeJob}
        onDelete={deleteJob}
      />
    </div>
  );
};
