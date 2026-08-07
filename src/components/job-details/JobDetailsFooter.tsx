import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { showToast } from '../../utils/toast';

interface JobDetailsFooterProps {
  selectedJob: Job;
  applyToJob: (id: string) => Promise<boolean> | boolean;
  onApplied?: () => void;
}

export const JobDetailsFooter: React.FC<JobDetailsFooterProps> = ({
  selectedJob,
  applyToJob,
  onApplied,
}) => {
  const { language, } = useApp();
  const t = translations[language];
  const [isStartedLocal, setIsStartedLocal] = useState<boolean>(
    selectedJob.status === 'in_progress' || selectedJob.status === 'start_requested'
  );

  useEffect(() => {
    setIsStartedLocal(selectedJob.status === 'in_progress' || selectedJob.status === 'start_requested');
  }, [selectedJob.status]);

  const handleApply = async () => {
    const success = await applyToJob(selectedJob.id);
    if (success && onApplied) {
      (onApplied as any)('applied');
    }
  };

  const isHiredOrConfirmed = ['hired', 'confirmed', 'todo', 'approved'].includes(selectedJob.status) || (selectedJob as any).hired;

  return (
    <footer className="sticky bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3.5 sm:p-4 flex items-center gap-4 shrink-0 mt-auto rounded-b-none sm:rounded-b-2xl">
      {(() => {
        if (selectedJob.status === 'completed') {
          return (
            <button
              disabled
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-brand-primary opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              {t.completedSuccessfully || "Muvaffaqiyatli yakunlandi"}
            </button>
          );
        } else if (isStartedLocal || selectedJob.status === 'in_progress' || selectedJob.status === 'start_requested') {
          return (
            <button
              disabled
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-emerald-600 opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Ish boshlandi
            </button>
          );
        } else if (isHiredOrConfirmed) {
          return (
            <button
              onClick={async () => {
                setIsStartedLocal(true);
                selectedJob.status = 'in_progress';
                ("Ish boshlandi!");
                try {
                  const { confirmStartJobApi } = await import('../../api/queries');
                  await confirmStartJobApi(selectedJob.id);
                } catch (e) {}
                if (onApplied) (onApplied as any)('in_progress');
              }}
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <PlayCircle size={18} />
              {t.startJob || "Ishni boshlash"}
            </button>
          );
        } else if (selectedJob.status === 'applied' || selectedJob.applied) {
          return (
            <button
              disabled
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-amber-600 opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {t.appliedLabel || "Ariza topshirildi"}
            </button>
          );
        } else {
          return (
            <button
              onClick={handleApply}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white h-13 sm:h-14 rounded-xl text-sm font-black shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={18} />
              {t.applyNow || "Ariza topshirish"}
            </button>
          );
        }
      })()}
    </footer>
  );
};
