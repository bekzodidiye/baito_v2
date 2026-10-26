import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Job } from '../../types';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { getJobLocalizedFields } from '../../utils/jobTranslationUtils';
import { JobDetailsHeader } from '../job-details/JobDetailsHeader';
import { JobDetailsHero } from '../job-details/JobDetailsHero';
import { JobDetailsCard } from '../job-details/JobDetailsCard';
import { JobDetailsLocation } from '../job-details/JobDetailsLocation';
import { JobDetailsTasks } from '../job-details/JobDetailsTasks';
import { JobDetailsRequirements } from '../job-details/JobDetailsRequirements';
import { JobDetailsFooter } from '../job-details/JobDetailsFooter';
import { useAuthStore } from "../../store/useAuthStore";

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
  const language = useAuthStore(s => s.language);
  const localized = getJobLocalizedFields(selectedJob, language);
  const fallbackDetails = getJobDetails(localized.title, language);

  const tasks = localized.responsibilities
    ? localized.responsibilities.split('\n').filter(Boolean)
    : fallbackDetails.tasks;

  const requirements = localized.requirements
    ? localized.requirements.split('\n').filter(Boolean)
    : fallbackDetails.requirements;

  const warning = localized.importantNote || fallbackDetails.warning;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedJob(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedJob]);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
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
            <JobDetailsTasks tasks={tasks} />
            <JobDetailsRequirements 
              requirements={requirements} 
              warning={warning} 
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
