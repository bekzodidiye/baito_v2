import React from 'react';
import { Send, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsFooterProps {
  selectedJob: Job;
  applyToJob: (id: string) => boolean;
  onApplied?: () => void;
}

export const JobDetailsFooter: React.FC<JobDetailsFooterProps> = ({
  selectedJob,
  applyToJob,
  onApplied,
}) => {
  const { language, setToastMessage } = useApp();
  const t = translations[language];

  const handleApply = () => {
    const success = applyToJob(selectedJob.id);
    if (success && onApplied) {
      onApplied();
    }
  };

  const dateStr = selectedJob.periodText ? selectedJob.periodText.split(' ')[0] : '';
  const dayStr = dateStr.includes('~') ? dateStr.split('~')[0].split('-')[2] : dateStr.split('-')[2];
  const jobDay = parseInt(dayStr) || 10;
  const today = 10;
  const isFuture = jobDay > today;

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
        } else if (selectedJob.status === 'confirmed' || selectedJob.status === 'todo') {
          if (isFuture) {
            return (
              <button
                disabled
                className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-emerald-600 opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock size={18} />
                {t.waitingToStart ? t.waitingToStart.replace('{day}', jobDay.toString()) : `${jobDay}-kunda boshlanishi kutilmoqda`}
              </button>
            );
          } else {
            return (
              <button
                onClick={() => {
                  setToastMessage(t.startedToast || "Ish boshlandi!");
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg shadow-rose-500/20 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <PlayCircle size={18} />
                {t.startJob || "Ishni boshlash"}
              </button>
            );
          }
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
