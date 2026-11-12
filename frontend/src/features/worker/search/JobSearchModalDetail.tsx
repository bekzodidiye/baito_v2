import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../../../types';
import { getJobDetails } from '../../../utils/jobDetailHelpers';
import { getJobLocalizedFields } from '../../../utils/jobTranslationUtils';
import { JobDetailsHeader } from '../../../components/job-details/JobDetailsHeader';
import { JobDetailsHero } from '../../../components/job-details/JobDetailsHero';
import { JobDetailsCard } from '../../../components/job-details/JobDetailsCard';
import { JobDetailsLocation } from '../../../components/job-details/JobDetailsLocation';
import { JobDetailsTasks } from '../../../components/job-details/JobDetailsTasks';
import { JobDetailsRequirements } from '../../../components/job-details/JobDetailsRequirements';
import { JobDetailsFooter } from '../../../components/job-details/JobDetailsFooter';
import { useAuthStore } from "../../../store/useAuthStore";

interface JobSearchModalDetailProps {
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  toggleBookmark?: (id: string) => void;
  applyToJob: (id: string) => Promise<boolean> | boolean;
}

export const JobSearchModalDetail: React.FC<JobSearchModalDetailProps> = ({
  selectedJob,
  setSelectedJob,
  applyToJob,
}) => {
  const language = useAuthStore(s => s.language);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Preserve last valid job for smooth exit animation
  const lastJobRef = useRef<Job | null>(selectedJob);
  if (selectedJob) {
    lastJobRef.current = selectedJob;
  }
  const currentJob = selectedJob || lastJobRef.current;
  const isModalOpen = Boolean(selectedJob);

  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [selectedJob?.id]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedJob(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedJob]);

  if (!currentJob) return null;
  const activeJob = currentJob;

  const localized = getJobLocalizedFields(activeJob, language);
  const fallbackDetails = getJobDetails(localized.title, language);

  const tasks = localized.responsibilities
    ? localized.responsibilities.split('\n').filter(Boolean)
    : fallbackDetails.tasks;

  const requirements = localized.requirements
    ? localized.requirements.split('\n').filter(Boolean)
    : fallbackDetails.requirements;

  const warning = localized.importantNote || fallbackDetails.warning;

  return (
    <AnimatePresence mode="wait">
      {isModalOpen && (
        <div
          key="worker-job-detail-modal-root"
          className="fixed inset-0 z-100 flex items-end justify-center p-0 pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setSelectedJob(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 280,
              mass: 0.8,
            }}
            className="relative bg-slate-50 w-full md:max-w-md rounded-t-3xl shadow-2xl flex flex-col h-[65vh] max-h-[88vh] overflow-hidden z-10 pointer-events-auto [transform:translateZ(0)] text-slate-900"
          >
            {/* Header */}
            <JobDetailsHeader 
              selectedJob={activeJob} 
              onClose={() => setSelectedJob(null)} 
            />

            {/* Scrollable Content Area */}
            <div ref={modalScrollRef} className="flex-1 overflow-y-auto no-scrollbar">
              {/* Hero Image Section */}
              <JobDetailsHero selectedJob={activeJob} />

              {/* Overlapping Content Container */}
              <div className="px-4 -mt-6 relative z-10 pb-6">
                <JobDetailsCard selectedJob={activeJob} />
                <JobDetailsLocation selectedJob={activeJob} />
                <JobDetailsTasks tasks={tasks} />
                <JobDetailsRequirements 
                  requirements={requirements} 
                  warning={warning} 
                />
              </div>
            </div>

            {/* Action Footer */}
            <JobDetailsFooter 
              selectedJob={activeJob} 
              applyToJob={applyToJob}
              onApplied={(newStatus?: any) => {
                if (selectedJob) {
                  setSelectedJob({ ...selectedJob, applied: true, status: newStatus || 'applied' });
                }
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
