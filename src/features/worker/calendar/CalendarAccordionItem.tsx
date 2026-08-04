import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../../../types';
import { CalendarJobCard } from './CalendarJobCard';

interface CalendarAccordionItemProps {
  id: string;
  activeAccordion: string | null;
  toggleAccordion: (name: string) => void;
  count: number;
  title: string;
  colorClass: string;
  badgeClass: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  jobs: Job[];
  setSelectedJob: (job: Job) => void;
  renderBadge: (job: Job) => React.ReactNode;
}

export const CalendarAccordionItem: React.FC<CalendarAccordionItemProps> = ({
  id,
  activeAccordion,
  toggleAccordion,
  count,
  title,
  colorClass,
  badgeClass,
  emptyIcon,
  emptyText,
  jobs,
  setSelectedJob,
  renderBadge,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 overflow-hidden">
      <button
        onClick={() => toggleAccordion(id)}
        className="w-full p-4 flex items-center justify-between font-display font-bold text-sm text-brand-text hover:bg-brand-surface-low transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className={`text-white font-extrabold text-[11px] w-6 h-6 flex items-center justify-center rounded-full select-none ${badgeClass}`}>
            {count}
          </span>
          <span>{title}</span>
        </div>
        <ChevronRight
          size={18}
          className={`text-brand-outline-variant transition-transform ${
            activeAccordion === id ? 'rotate-90 text-brand-text' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {activeAccordion === id && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-brand-surface-low"
          >
            <div className="p-4 flex flex-col gap-2">
              {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-3.5 px-3 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/60 text-center select-none animate-fade-in my-0.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 border ${colorClass}`}>
                    {emptyIcon}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 max-w-[220px] leading-normal font-sans">
                    {emptyText}
                  </p>
                </div>
              ) : (
                jobs.map((job) => (
                  <CalendarJobCard
                    key={job.id}
                    job={job}
                    setSelectedJob={setSelectedJob}
                    badge={renderBadge(job)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
