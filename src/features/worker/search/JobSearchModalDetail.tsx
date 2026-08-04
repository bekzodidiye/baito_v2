import React from 'react';
import { motion } from 'motion/react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { JobDetailsHeader } from '../job-details/JobDetailsHeader';
import { JobDetailsHero } from '../job-details/JobDetailsHero';
import { JobDetailsCard } from '../job-details/JobDetailsCard';
import { JobDetailsLocation } from '../job-details/JobDetailsLocation';
import { JobDetailsTasks } from '../job-details/JobDetailsTasks';
import { JobDetailsRequirements } from '../job-details/JobDetailsRequirements';
import { JobDetailsFooter } from '../job-details/JobDetailsFooter';

interface JobSearchModalDetailProps {
  selectedJob: Job;
  setSelectedJob: (job: Job | null) => void;
  toggleBookmark: (id: string) => void;
  applyToJob: (id: string) => Promise<boolean> | boolean;
}

export const JobSearchModalDetail: React.FC<JobSearchModalDetailProps> = ({
  selectedJob,
  setSelectedJob,
  applyToJob,
}) => {
  const { language } = useApp();
  const modalScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [selectedJob?.id]);

  const fallbackDetails = getJobDetails(selectedJob.title, language);

  const tasks = selectedJob.responsibilities
    ? selectedJob.responsibilities.split('\n').filter(Boolean)
    : fallbackDetails.tasks;

  const requirements = selectedJob.requirements
    ? selectedJob.requirements.split('\n').filter(Boolean)
    : fallbackDetails.requirements;

  const warning = selectedJob.importantNote || fallbackDetails.warning;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedJob(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-slate-50 w-full md:max-w-md rounded-t-3xl shadow-2xl flex flex-col h-[55vh] max-h-[88vh] md:h-[65vh] overflow-hidden z-10 [transform:translateZ(0)]"
      >
        {/* Header */}
        <JobDetailsHeader 
          selectedJob={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />

        {/* Scrollable Content Area */}
        <div ref={modalScrollRef} className="flex-1 overflow-y-auto no-scrollbar">
          {/* Hero Image Section */}
          <JobDetailsHero selectedJob={selectedJob} />

          {/* Overlapping Content Container */}
          <div className="px-4 -mt-6 relative z-10 pb-6">
            <JobDetailsCard selectedJob={selectedJob} />
            <JobDetailsLocation selectedJob={selectedJob} />
            <JobDetailsTasks tasks={tasks} />
            <JobDetailsRequirements 
              requirements={requirements} 
              warning={warning} 
            />
          </div>
        </div>

        {/* Action Footer */}
        <JobDetailsFooter 
          selectedJob={selectedJob} 
          applyToJob={applyToJob}
          onApplied={(newStatus?: any) => setSelectedJob({ ...selectedJob, applied: true, status: newStatus || 'applied' })}
        />
      </motion.div>
    </div>
  );
};
