import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { showToast } from '../../utils/toast';
import { requestStartJobApi } from '../../api/queries';
import { ConfirmModal } from '../common/ConfirmModal';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Applying commits the worker to turning up. It went through on one press,
  // which on a phone is one stray tap while scrolling a listing.
  const [confirmingApply, setConfirmingApply] = useState(false);

  useEffect(() => {
    setIsStartedLocal(selectedJob.status === 'in_progress' || selectedJob.status === 'start_requested');
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
              aria-label="Ish muvaffaqiyatli yakunlandi"
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
              aria-label="Ish boshlandi"
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
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  setIsStartedLocal(true);
                  // The worker asks to start; the employer confirms. This used
                  // to call confirm-start, the employer's own endpoint, which
                  // answers 403 to a worker — so the button reverted itself and
                  // said nothing, and no worker could ever start a job here.
                  selectedJob.status = 'start_requested';
                  const success = await requestStartJobApi(selectedJob.id);
                  if (success && onApplied) (onApplied as any)('start_requested');
                } catch (e) {
                  setIsStartedLocal(false);
                  selectedJob.status = 'hired'; // Revert back
                  showToast(t.startJobFailed || "Ishni boshlab bo'lmadi. Qaytadan urinib ko'ring.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              aria-label="Ishni boshlash"
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
              onClick={() => setConfirmingApply(true)}
              disabled={isSubmitting}
              aria-label="Ushbu ishga ariza topshirish"
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
    </footer>
  );
};
