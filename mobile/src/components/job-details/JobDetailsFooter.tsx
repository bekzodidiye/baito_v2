import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, PlayCircle } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { requestStartJobApi, completeJobApi } from '../../api/queries';
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
  const { language } = useApp();
  const t = translations[language];
  const [isStartedLocal, setIsStartedLocal] = useState<boolean>(
    selectedJob.status === 'in_progress'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsStartedLocal(selectedJob.status === 'in_progress');
  }, [selectedJob.status]);

  const handleApply = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await applyToJob(selectedJob.id);
      if (success && onApplied) {
        (onApplied as any)('applied');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartJob = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      setIsStartedLocal(true);
      selectedJob.status = 'in_progress';
      const success = await requestStartJobApi(selectedJob.id);
      if (success && onApplied) (onApplied as any)('in_progress');
      showToast(language === 'uz' ? "Ish boshlandi!" : language === 'ru' ? "Работа начата!" : "Job started!", 'success');
    } catch (e: any) {
      setIsStartedLocal(false);
      selectedJob.status = 'confirmed';
      showToast(e?.message || (language === 'uz' ? "Ishni boshlab bo'lmadi" : language === 'ru' ? "Не удалось начать работу" : "Failed to start job"), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteJob = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await completeJobApi(selectedJob.id);
      const newStatus = response?.job_status || 'completed';
      selectedJob.status = newStatus;
      setIsStartedLocal(false);
      if (onApplied) (onApplied as any)(newStatus);
      showToast(
        language === 'uz'
          ? "Ish muvaffaqiyatli yakunlandi! Ish beruvchiga xabar yuborildi."
          : language === 'ru'
            ? "Работа успешно завершена! Работодатель уведомлен."
            : "Job successfully completed! Employer has been notified.",
        'success'
      );
    } catch (e: any) {
      showToast(
        e?.message || (language === 'uz' ? "Ishni yakunlab bo'lmadi" : language === 'ru' ? 'Не удалось завершить работу' : "Failed to complete job"),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHiredOrConfirmed = ['hired', 'confirmed', 'todo', 'approved'].includes(selectedJob.status) || (selectedJob as any).hired;

  return (
    <footer className="sticky bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 md:p-6 flex items-center gap-4 shrink-0 mt-auto rounded-b-none sm:rounded-b-none sm:rounded-bl-3xl">
      {(() => {
        if (selectedJob.status === 'completed') {
          return (
            <button
              disabled
              aria-label="Ish muvaffaqiyatli yakunlandi"
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-brand-primary opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              {t.completedSuccessfully || "Muvaffaqiyatli yakunlandi"}
            </button>
          );
        } else if (selectedJob.status === 'in_progress' || isStartedLocal) {
          return (
            <button
              onClick={handleCompleteJob}
              disabled={isSubmitting}
              aria-label={(t as any).completeJob || "Ishni yakunlash"}
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <CheckCircle2 size={18} />
              {(t as any).completeJob || "Ishni yakunlash"}
            </button>
          );
        } else if (isHiredOrConfirmed || selectedJob.status === 'start_requested') {
          return (
            <button
              onClick={handleStartJob}
              disabled={isSubmitting}
              aria-label={(t as any).startJob || "Ishni boshlash"}
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <PlayCircle size={18} />
              {(t as any).startJob || "Ishni boshlash"}
            </button>
          );
        } else if (selectedJob.status === 'applied' || selectedJob.applied) {
          return (
            <button
              disabled
              aria-label="Ariza topshirilgan"
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
              disabled={isSubmitting}
              aria-label="Ushbu ishga ariza topshirish"
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-brand-primary/50 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/20 active:scale-[0.98] cursor-pointer'
              }`}
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
