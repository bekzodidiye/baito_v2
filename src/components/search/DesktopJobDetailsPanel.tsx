import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { JobDetailsHero } from '../job-details/JobDetailsHero';
import { JobDetailsCard } from '../job-details/JobDetailsCard';
import { JobDetailsLocation } from '../job-details/JobDetailsLocation';
import { JobDetailsTasks } from '../job-details/JobDetailsTasks';
import { JobDetailsRequirements } from '../job-details/JobDetailsRequirements';
import { JobDetailsFooter } from '../job-details/JobDetailsFooter';

interface DesktopJobDetailsPanelProps {
  activeJob: Job | null;
  toggleBookmark: (id: string) => void;
  applyToJob: (id: string) => boolean;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
}

const DesktopJobDetailsPanelComponent: React.FC<DesktopJobDetailsPanelProps> = ({
  activeJob,
  applyToJob,
  selectedJob,
  setSelectedJob,
}) => {
  const { language } = useApp();
  const t = translations[language];

  if (!activeJob) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center text-slate-400"
        >
          <Briefcase size={40} className="text-slate-300 mb-2" />
          <p className="font-display font-bold text-sm">{t.jobNotSelected}</p>
          <p className="text-xs mt-1">{t.selectJobDetails}</p>
        </motion.div>
      </AnimatePresence>
    );
  }

  const jobDetails = getJobDetails(activeJob.title, language);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={activeJob.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs h-full"
      >
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <JobDetailsHero selectedJob={activeJob} />

          <div className="px-4 -mt-6 relative z-10 pb-4">
            <JobDetailsCard selectedJob={activeJob} />
            <JobDetailsLocation selectedJob={activeJob} />
            <JobDetailsTasks tasks={jobDetails.tasks} />
            <JobDetailsRequirements 
              requirements={jobDetails.requirements} 
              warning={jobDetails.warning} 
            />
          </div>
        </div>

        <JobDetailsFooter 
          selectedJob={activeJob} 
          applyToJob={applyToJob}
          onApplied={() => {
            if (selectedJob && selectedJob.id === activeJob.id) {
              setSelectedJob({ ...selectedJob, applied: true, status: 'applied' });
            }
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export const DesktopJobDetailsPanel = memo(DesktopJobDetailsPanelComponent);
