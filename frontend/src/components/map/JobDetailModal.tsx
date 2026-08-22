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

interface JobDetailModalProps {
  selectedJob: Job;
  setSelectedJob: (job: Job | null) => void;
  toggleBookmark: (id: string) => void;
  applyToJob: (id: string) => void;
  distanceToSelectedJob: string | null;
  handleCalculateDistance: () => void;
  isLocating: boolean;
  onOpenOnMap?: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  selectedJob,
  setSelectedJob,
  applyToJob,
  distanceToSelectedJob,
  handleCalculateDistance,
  isLocating,
  onOpenOnMap,
}) => {
  const { language } = useApp();
  const jobDetails = getJobDetails(selectedJob.title, language);

  return (
    <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      {/* Backdrop inside map */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={() => setSelectedJob(null)}
        className="absolute inset-0 bg-black/40 pointer-events-auto"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ 
          type: 'spring',
          damping: 26,
          stiffness: 240
        }}
        className="relative bg-slate-50 w-full sm:w-[480px] sm:max-w-[90vw] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[88%] sm:h-auto sm:max-h-[88vh] overflow-hidden z-10 pointer-events-auto border border-slate-200/80 mb-0 [transform:translateZ(0)] text-slate-900"
      >
        {/* Header */}
        <JobDetailsHeader 
          selectedJob={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Hero Image Section */}
          <JobDetailsHero selectedJob={selectedJob} />

          {/* Overlapping Content Container */}
          <div className="px-3 -mt-6 relative z-10 pb-6 space-y-3">
            <JobDetailsCard selectedJob={selectedJob} />
            <JobDetailsLocation 
              selectedJob={selectedJob}
              onOpenOnMap={onOpenOnMap}
              distanceToSelectedJob={distanceToSelectedJob}
              handleCalculateDistance={handleCalculateDistance}
              isLocating={isLocating}
            />
            <JobDetailsTasks tasks={jobDetails.tasks} />
            <JobDetailsRequirements 
              requirements={jobDetails.requirements} 
              warning={jobDetails.warning} 
            />
          </div>
        </div>

        {/* Fixed Footer at the bottom */}
        <JobDetailsFooter 
          selectedJob={selectedJob} 
          applyToJob={(id) => {
            applyToJob(id);
            return true;
          }}
          onApplied={() => setSelectedJob({ ...selectedJob, applied: true, status: 'applied' })}
        />
      </motion.div>
    </div>
  );
};
