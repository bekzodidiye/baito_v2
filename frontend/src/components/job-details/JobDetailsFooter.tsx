import React, { useState, useEffect, useContext } from 'react';
import { Send, CheckCircle2, PlayCircle } from 'lucide-react';
import { Job } from '../../types';
import { translations } from '../../translations';
import { showToast } from '../../utils/toast';
import { requestStartJobApi, completeJobApi } from '../../api/queries';
import { ConfirmModal } from '../common/ConfirmModal';
import { QueryClientContext } from '@tanstack/react-query';
import { useAuthStore } from "../../store/useAuthStore";

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
  const language = useAuthStore(s => s.language);
    const userProfile = useAuthStore(s => s.userProfile);
  // The server refuses an application from an unverified account. Saying so
  // before the press is the difference between an explanation and a rejection.
  const isVerified = !!userProfile?.isVerified;
  const t = translations[language];
  const queryClient = useContext(QueryClientContext);
  const [isStartedLocal, setIsStartedLocal] = useState<boolean>(
    selectedJob.status === 'in_progress'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Applying commits the worker to turning up. It went through on one press,
  // which on a phone is one stray tap while scrolling a listing.
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  // Starting a shift is a commitment the employer is told about immediately,
  // and this button sits under a thumb on a phone. It fired on the first tap.
  const [confirmingStart, setConfirmingStart] = useState(false);

  useEffect(() => {
    setIsStartedLocal(selectedJob.status === 'in_progress');
  }, [selectedJob.status]);

  const handleFinishJob = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await completeJobApi(selectedJob.id);
      const newStatus = response?.job_status || 'completed';
      selectedJob.status = newStatus;
      setIsStartedLocal(false); // Should be false even if it went to 'confirmed' so the button becomes 'Ishni boshlash'
      showToast(
        language === 'uz'
          ? "Ish muvaffaqiyatli yakunlandi! Ish beruvchiga xabar yuborildi."
          : language === 'ru'
          ? "Работа успешно завершена! Работодатель уведомлен."
          : "Job successfully completed! Employer has been notified."
      );
      queryClient?.invalidateQueries({ queryKey: ['jobs'] });
      queryClient?.invalidateQueries({ queryKey: ['calendarJobs'] });
      queryClient?.invalidateQueries({ queryKey: ['workerApplications'] });
      if (onApplied) (onApplied as any)(newStatus);
    } catch (e: any) {
      showToast(e?.message || (language === 'uz' ? "Ishni yakunlab bo'lmadi" : "Failed to complete job"), 'error');
    } finally {
      setIsSubmitting(false);
      setConfirmingFinish(false);
    }
  };

  const handleStart = async () => {
    setConfirmingStart(false);
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      setIsStartedLocal(true);
      // The worker starts the shift; nobody confirms it afterwards. An
      // application the old two-step flow left at start_requested arrives here
      // too, and the same call moves it on.
      selectedJob.status = 'in_progress';
      const success = await requestStartJobApi(selectedJob.id);
      if (success && onApplied) (onApplied as any)('in_progress');
    } catch (e) {
      setIsStartedLocal(false);
      selectedJob.status = 'hired'; // Revert back
      showToast(t.startJobFailed || "Ishni boshlab bo'lmadi. Qaytadan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async () => {
    if (isSubmitting) return;
    if (!isVerified) {
      setConfirmingApply(false);
      showToast(
        language === 'ru'
          ? 'Ваши документы ещё не подтверждены.'
          : language === 'en'
          ? 'Your documents have not been verified yet.'
          : "Hujjatlaringiz hali tasdiqlanmagan.",
        'error',
      );
      return;
    }
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

  // Say which shift, when, and for how much — the three things a worker needs
  // to recognise they are about to commit to the right job.
  const shiftWhen = [selectedJob.workDate, selectedJob.workTime].filter(Boolean).join(', ');
  const applyQuestion = {
    ru: `«${selectedJob.title}»${shiftWhen ? ` — ${shiftWhen}` : ''}. ${selectedJob.salary ? `Оплата: ${selectedJob.salary}.` : ''} Работодатель увидит вашу заявку.`,
    en: `"${selectedJob.title}"${shiftWhen ? ` — ${shiftWhen}` : ''}. ${selectedJob.salary ? `Pay: ${selectedJob.salary}.` : ''} The employer will see your application.`,
    uz: `«${selectedJob.title}»${shiftWhen ? ` — ${shiftWhen}` : ''}. ${selectedJob.salary ? `To'lov: ${selectedJob.salary}.` : ''} Ish beruvchi arizangizni ko'radi.`,
  }[language as 'uz' | 'ru' | 'en'] ?? `«${selectedJob.title}» uchun ariza topshirasizmi?`;

  const isHiredOrConfirmed = ['hired', 'confirmed', 'todo', 'approved'].includes(selectedJob.status) || (selectedJob as any).hired;

  return (
    <footer className="sticky bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3.5 sm:p-4 flex items-center gap-4 shrink-0 mt-auto rounded-b-none sm:rounded-b-2xl">
      {(() => {
        if (selectedJob.status === 'completed') {
          return (
            <button
              disabled
              aria-label={t.jobCompletedAria}
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-brand-primary opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              {t.completedSuccessfully || "Muvaffaqiyatli yakunlandi"}
            </button>
          );
        } else if (selectedJob.status === 'in_progress') {
          return (
            <button
              onClick={() => setConfirmingFinish(true)}
              disabled={isSubmitting}
              aria-label={t.completeJob}
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] cursor-pointer'
              }`}
            >
              <CheckCircle2 size={18} />
              {t.completeJob}
            </button>
          );
        } else if (isHiredOrConfirmed || selectedJob.status === 'start_requested') {
          return (
            <button
              onClick={() => { if (!isSubmitting) setConfirmingStart(true); }}
              disabled={isSubmitting}
              aria-label={t.startJob}
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] cursor-pointer'}`}
            >
              <PlayCircle size={18} />
              {t.startJob || "Ishni boshlash"}
            </button>
          );
        } else if (selectedJob.status === 'applied' || selectedJob.applied) {
          return (
            <button
              disabled
              aria-label={t.alreadyApplied}
              className="flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-extrabold shadow-md bg-amber-600 opacity-90 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {t.appliedLabel || "Ariza topshirildi"}
            </button>
          );
        } else {
          return (
            <button
              onClick={() => setConfirmingApply(true)}
              disabled={isSubmitting}
              aria-label={t.applyToThisJob}
              className={`flex-1 text-white h-13 sm:h-14 rounded-xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-brand-primary/50 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/20 active:scale-[0.98] cursor-pointer'}`}
            >
              <Send size={18} />
              {t.applyNow || "Ariza topshirish"}
            </button>
          );
        }
      })()}

      <ConfirmModal
        isOpen={confirmingApply}
        title={language === 'ru' ? 'Подать заявку?' : language === 'en' ? 'Apply for this shift?' : 'Ariza topshirasizmi?'}
        message={applyQuestion}
        confirmText={language === 'ru' ? 'Подать' : language === 'en' ? 'Apply' : 'Topshirish'}
        cancelText={language === 'ru' ? 'Отмена' : language === 'en' ? 'Cancel' : 'Bekor qilish'}
        isDestructive={false}
        onConfirm={handleApply}
        onCancel={() => setConfirmingApply(false)}
      />

      <ConfirmModal
        isOpen={confirmingStart}
        title={language === 'ru' ? 'Начать работу?' : language === 'en' ? 'Start this shift?' : "Ishni boshlaysizmi?"}
        message={language === 'ru'
          ? 'Работодатель сразу увидит, что вы на месте и готовы начать.'
          : language === 'en'
          ? 'The employer is told straight away that you have arrived and are ready to begin.'
          : "Ish beruvchiga darhol xabar boradi: siz yetib keldingiz va boshlashga tayyorsiz."}
        confirmText={language === 'ru' ? 'Начать' : language === 'en' ? 'Start' : 'Boshlash'}
        cancelText={language === 'ru' ? 'Отмена' : language === 'en' ? 'Cancel' : 'Bekor qilish'}
        isDestructive={false}
        onConfirm={handleStart}
        onCancel={() => setConfirmingStart(false)}
      />

      <ConfirmModal
        isOpen={confirmingFinish}
        title={language === 'uz' ? "Ishni yakunlash" : language === 'ru' ? "Завершить работу?" : "Complete Job?"}
        message={
          language === 'uz'
            ? `«${selectedJob.title}» ishini haqiqatan ham yakunladingizmi? Ish beruvchiga xabar yuboriladi.`
            : language === 'ru'
            ? `Вы уверены, что завершили работу «${selectedJob.title}»? Работодатель получит уведомление.`
            : `Are you sure you completed "${selectedJob.title}"? Employer will be notified.`
        }
        confirmText={language === 'uz' ? "Ha, yakunladim" : language === 'ru' ? "Да, завершил" : "Yes, complete"}
        cancelText={language === 'uz' ? "Bekor qilish" : language === 'ru' ? "Отмена" : "Cancel"}
        isDestructive={false}
        onConfirm={handleFinishJob}
        onCancel={() => setConfirmingFinish(false)}
      />
    </footer>
  );
};
