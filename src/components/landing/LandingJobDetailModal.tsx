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
import { Send, ArrowRight } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface LandingJobDetailModalProps {
  selectedJob: Job;
  setSelectedJob: (job: Job | null) => void;
  toggleBookmark?: (id: string) => void;
  applyToJob?: (id: string) => void;
  distanceToSelectedJob?: string | null;
  handleCalculateDistance?: () => void;
  isLocating?: boolean;
  onOpenOnMap?: () => void;
}

export const LandingJobDetailModal: React.FC<LandingJobDetailModalProps> = ({
  selectedJob,
  setSelectedJob,
  distanceToSelectedJob,
  handleCalculateDistance,
  isLocating,
  onOpenOnMap,
}) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const jobDetails = getJobDetails(selectedJob.title, language);

  const handleApplyOnLanding = () => {
    setSelectedJob(null);
    try {
      localStorage.setItem('baito_preselected_role', 'worker');
    } catch (e) {}
    setCurrentScreen('login');
  };

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

      {/* Modal Container for Landing Page - Clean Light Theme */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ 
          type: 'spring',
          damping: 26,
          stiffness: 240
        }}
        className="relative bg-slate-50 w-full sm:w-[480px] sm:max-w-[90vw] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[75%] max-h-[78%] sm:h-[510px] sm:max-h-[530px] overflow-hidden z-10 pointer-events-auto border border-slate-200/80 mb-0 [transform:translateZ(0)] text-slate-900"
      >
        {/* Header */}
        <JobDetailsHeader 
          selectedJob={selectedJob} 
          onClose={() => setSelectedJob(null)} 
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
          {/* Hero Image Section */}
          <JobDetailsHero selectedJob={selectedJob} />

          {/* Overlapping Content Container */}
          <div className="px-3 -mt-6 relative z-10 space-y-3">
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

            {/* Action Button at bottom of content */}
            <div className="pt-2">
              <button
                onClick={handleApplyOnLanding}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white h-12 sm:h-13 rounded-xl text-sm font-black shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{language === 'ru' ? 'Подать заявку на смену' : 'Ushbu smenaga ariza topshirish'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
