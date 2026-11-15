import React, { useEffect, useRef } from 'react';
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
  const modalScrollRef = useRef<HTMLDivElement>(null);

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
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [selectedJob?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedJob(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedJob]);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-stretch sm:justify-end pointer-events-none">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => setSelectedJob(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      {/* Slide-over Sheet Container: Bottom Sheet on Mobile, Right Drawer on Desktop */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        initial={{
          x: typeof window !== 'undefined' && window.innerWidth >= 640 ? '100%' : 0,
          y: typeof window !== 'undefined' && window.innerWidth >= 640 ? 0 : '100%'
        }}
        animate={{
          x: 0,
          y: 0
        }}
        exit={{
          x: typeof window !== 'undefined' && window.innerWidth >= 640 ? '100%' : 0,
          y: typeof window !== 'undefined' && window.innerWidth >= 640 ? 0 : '100%'
        }}
        transition={{
          type: 'spring',
          damping: 28,
          stiffness: 280,
          mass: 0.8
        }}
        className="relative bg-slate-50 w-full sm:w-[540px] md:w-[600px] lg:w-[640px] h-[90vh] sm:h-full max-h-[92vh] sm:max-h-full rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl shadow-2xl flex flex-col overflow-hidden z-10 pointer-events-auto border-t sm:border-t-0 sm:border-l border-slate-200/80 mb-0 [transform:translateZ(0)] text-slate-900"
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
          <div className="px-4 sm:px-6 -mt-6 relative z-10 pb-8 space-y-4">
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
