import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  X,
  Share2,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Clock,
  Users,
  Check,
  Play,
} from 'lucide-react';
import { Job } from '../../types';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { getJobLocalizedFields } from '../../utils/jobTranslationUtils';
import { shareJob } from '../../utils/shareJob';
import { JobDetailsHero } from '../../components/job-details/JobDetailsHero';
import { JobDetailsCard } from '../../components/job-details/JobDetailsCard';
import { JobDetailsLocation } from '../../components/job-details/JobDetailsLocation';
import { JobDetailsTasks } from '../../components/job-details/JobDetailsTasks';
import { JobDetailsRequirements } from '../../components/job-details/JobDetailsRequirements';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface EmployerJobDetailModalProps {
  job: Job | null;
  onClose: () => void;
  language: 'uz' | 'ru' | 'en';
  onComplete?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onConfirmStart?: (jobId: string) => void;
}

export const EmployerJobDetailModal: React.FC<EmployerJobDetailModalProps> = ({
  job,
  onClose,
  language,
  onComplete,
  onDelete,
  onConfirmStart,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Preserve last valid job for smooth exit animation
  const lastJobRef = useRef<Job | null>(job);
  if (job) {
    lastJobRef.current = job;
  }
  const currentJob = job || lastJobRef.current;

  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [job?.id]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentJob) return null;
  const activeJob = currentJob;
  const isModalOpen = Boolean(job);

  const localized = getJobLocalizedFields(activeJob, language);
  const fallbackDetails = getJobDetails(localized.title, language);

  const tasks = localized.responsibilities
    ? localized.responsibilities.split('\n').filter(Boolean)
    : fallbackDetails.tasks;

  const requirements = localized.requirements
    ? localized.requirements.split('\n').filter(Boolean)
    : fallbackDetails.requirements;

  const warning = localized.importantNote || fallbackDetails.warning;

  const hired = Number(activeJob.hiredCount ?? 0);
  const vac = Math.max(1, Number(activeJob.vacancies ?? (activeJob.neededWorkers ? parseInt(activeJob.neededWorkers, 10) : 1)));

  // Calculate current workflow step index (1-4)
  const getWorkflowStep = () => {
    if (activeJob.status === 'completed') return 4;
    if (activeJob.status === 'in_progress') return 3;
    if (activeJob.status === 'start_requested') return 3;
    if (hired > 0) return 2;
    return 1;
  };
  const activeStep = getWorkflowStep();

  const workflowSteps = [
    {
      step: 1,
      title: language === 'uz' ? "E'lon yaratildi" : language === 'ru' ? 'Вакансия создана' : 'Job posted',
      desc: activeJob.createdAt
        ? new Date(activeJob.createdAt).toLocaleDateString()
        : language === 'uz' ? 'Moderatsiyadan o\'tgan va faol' : language === 'ru' ? 'Активно' : 'Active',
      status: activeStep > 1 ? 'completed' : 'current',
    },
    {
      step: 2,
      title: language === 'uz' ? 'Xodimlar saralashi' : language === 'ru' ? 'Набор сотрудников' : 'Staff recruitment',
      desc: hired >= vac
        ? (language === 'uz' ? `Barcha o'rinlar to'ldirildi (${hired}/${vac})` : language === 'ru' ? `Все места заняты (${hired}/${vac})` : `All positions filled (${hired}/${vac})`)
        : hired > 0
          ? (language === 'uz' ? `${hired}/${vac} xodim qabul qilindi` : language === 'ru' ? `Набрано: ${hired}/${vac}` : `${hired}/${vac} hired`)
          : (language === 'uz' ? `Nomzodlar arizasi kutilmoqda (0/${vac})` : language === 'ru' ? `Ожидаются заявки (0/${vac})` : `Awaiting applications (0/${vac})`),
      status: activeStep > 2 ? 'completed' : activeStep === 2 ? 'current' : 'pending',
    },
    {
      step: 3,
      title: language === 'uz' ? 'Ish jarayoni' : language === 'ru' ? 'Выполнение работы' : 'Work in progress',
      desc: activeJob.status === 'start_requested'
        ? (language === 'uz' ? 'Xodim kelgan, boshlashni tasdiqlang' : language === 'ru' ? 'Работник ожидает подтверждения начала' : 'Worker waiting for start confirmation')
        : activeJob.status === 'in_progress'
          ? (language === 'uz' ? 'Smena davom etmoqda' : language === 'ru' ? 'Работа в процессе выполнения' : 'Shift in progress')
          : activeJob.status === 'completed'
            ? (language === 'uz' ? 'Smena muvaffaqiyatli yakunlangan' : language === 'ru' ? 'Работа успешно завершена' : 'Shift completed')
            : (language === 'uz' ? 'Smena boshlanishi kutilmoqda' : language === 'ru' ? 'Ожидается выход на смену' : 'Shift pending'),
      status: activeJob.status === 'completed' ? 'completed' : activeStep === 3 ? 'current' : 'pending',
    },
    {
      step: 4,
      title: language === 'uz' ? 'Yakunlash va Hisob-kitob' : language === 'ru' ? 'Завершение и расчет' : 'Completion & Payment',
      desc: activeJob.status === 'completed'
        ? activeJob.payoutStatus === 'paid'
          ? (language === 'uz' ? 'To\'lov to\'liq amalga oshirilgan' : language === 'ru' ? 'Оплата произведена' : 'Payment completed')
          : activeJob.payoutStatus === 'payment_declared'
            ? (language === 'uz' ? 'To\'lov tekshirilmoqda' : language === 'ru' ? 'Оплата ожидает подтверждения' : 'Payment verification pending')
            : activeJob.payoutStatus === 'invoiced'
              ? (language === 'uz' ? 'Hisob taqdim etilgan, to\'lov kutilmoqda' : language === 'ru' ? 'Ожидает оплаты' : 'Awaiting payment')
              : (language === 'uz' ? 'Ish muvaffaqiyatli tugatilgan' : language === 'ru' ? 'Работа завершена' : 'Job finished')
        : (language === 'uz' ? 'Smena yakunlangach hisob-kitob qilinadi' : language === 'ru' ? 'Оплата после завершения' : 'Settlement after shift'),
      status: activeJob.status === 'completed' ? 'completed' : 'pending',
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {isModalOpen && (
        <div key="employer-job-detail-modal-root" className="fixed inset-0 z-100 flex items-end sm:items-stretch sm:justify-end pointer-events-none">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Slide-over Sheet Container: Bottom Sheet on Mobile, Right Drawer on Desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
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
          {/* Sticky Drawer Header */}
          <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-14 md:h-16 flex items-center px-4 md:px-6 justify-between shrink-0 sm:rounded-tl-3xl">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onClose}
                aria-label={language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : 'Back'}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand-primary transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft size={20} className="stroke-[2.5]" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold text-brand-primary truncate tracking-tight">
                    {language === 'uz' ? 'Ish tafsilotlari' : language === 'ru' ? 'Детали работы' : 'Job Details'}
                  </h1>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    activeJob.status === 'in_progress'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeJob.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : activeJob.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                  }`}>
                    {activeJob.status === 'in_progress'
                      ? (language === 'uz' ? 'Jarayonda' : language === 'ru' ? 'В процессе' : 'In progress')
                      : activeJob.status === 'completed'
                        ? (language === 'uz' ? 'Tugallangan' : language === 'ru' ? 'Завершено' : 'Completed')
                        : activeJob.status === 'pending'
                          ? (language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'На модерации' : 'Pending')
                          : (language === 'uz' ? 'Ochiq' : language === 'ru' ? 'Активно' : 'Open')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => shareJob({ id: activeJob.id, title: localized.title, company: activeJob.company }, language)}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title={language === 'uz' ? 'Ulashish' : language === 'ru' ? 'Поделиться' : 'Share'}
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={onClose}
                aria-label={language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content (Single vertical flow with optimal reading width) */}
          <div ref={modalScrollRef} className="flex-1 overflow-y-auto no-scrollbar">
            {/* Hero Image Section */}
            <JobDetailsHero selectedJob={activeJob} />

            {/* Overlapping Content Feed */}
            <div className="px-4 sm:px-6 -mt-6 relative z-10 pb-8 space-y-4">
              {/* Job Specs Card */}
              <JobDetailsCard selectedJob={activeJob} />

              {/* Ish jarayoni bosqichlari (Job Workflow Timeline) */}
              <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                      <Clock size={16} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {language === 'uz' ? 'Ish jarayoni bosqichlari' : language === 'ru' ? 'Этапы работы' : 'Job workflow'}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {activeStep}/4
                  </span>
                </div>

                {/* Vertical Stepper Timeline */}
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {workflowSteps.map((ws) => (
                    <div key={ws.step} className="flex items-start gap-3.5 relative z-10">
                      {/* Step Status Icon */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-xs ${
                          ws.status === 'completed'
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-50'
                            : ws.status === 'current'
                              ? 'bg-brand-primary text-white ring-4 ring-brand-primary/15 animate-pulse'
                              : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {ws.status === 'completed' ? (
                          <Check size={14} strokeWidth={2.8} />
                        ) : (
                          ws.step
                        )}
                      </div>

                      {/* Step Label & Description */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h4
                          className={`text-sm font-bold leading-tight ${
                            ws.status === 'current'
                              ? 'text-brand-primary'
                              : ws.status === 'completed'
                                ? 'text-slate-900'
                                : 'text-slate-500'
                          }`}
                        >
                          {ws.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {ws.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Qabul qilingan ishchilar (Hired Workers) */}
              <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-primary flex items-center justify-center font-bold">
                      <Users size={16} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {language === 'uz' ? 'Qabul qilingan ishchilar' : language === 'ru' ? 'Принятые работники' : 'Hired workers'}
                    </h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    hired >= vac
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-50 text-brand-primary'
                  }`}>
                    {hired} / {vac}
                  </span>
                </div>

                {(job.hiredWorkers || []).length > 0 ? (
                  <div className="space-y-2.5">
                    {job.hiredWorkers!.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0 overflow-hidden">
                            {worker.avatarUrl ? (
                              <img
                                src={worker.avatarUrl}
                                alt={worker.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallback =
                                    'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                                  if (target.src !== fallback) {
                                    target.src = fallback;
                                  }
                                }}
                              />
                            ) : (
                              worker.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-brand-primary text-sm truncate">{worker.name}</h5>
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                              {language === 'uz' ? 'Qabul qilingan' : language === 'ru' ? 'Принят' : 'Hired'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 px-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <Users size={24} className="mx-auto text-slate-300 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-500">
                      {language === 'uz'
                        ? 'Hali ishchilar qabul qilinmagan'
                        : language === 'ru'
                          ? 'Ожидаются заявки'
                          : 'No workers accepted yet'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'uz'
                        ? 'Nomzodlar arizalari ko\'rib chiqilgach shu yerda aks etadi'
                        : language === 'ru'
                          ? 'Идет поиск'
                          : 'Candidates will appear here once accepted'}
                    </p>
                  </div>
                )}
              </section>

              {/* Location with Leaflet Map Preview */}
              <JobDetailsLocation selectedJob={activeJob} />

              {/* Tasks & Requirements */}
              <JobDetailsTasks tasks={tasks} />
              <JobDetailsRequirements requirements={requirements} warning={warning} />
            </div>
          </div>

          {/* Action Footer */}
          <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 sm:p-4 shrink-0 flex items-center gap-3">
            {activeJob.status === 'in_progress' && onComplete ? (
              <button
                onClick={() => onComplete(activeJob.id)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>{language === 'uz' ? 'Ishni yakunlash' : language === 'ru' ? 'Завершить работу' : 'Complete Job'}</span>
              </button>
            ) : activeJob.status === 'start_requested' && onConfirmStart ? (
              <>
                <button
                  onClick={onClose}
                  className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all"
                >
                  {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    onConfirmStart(activeJob.id);
                    onClose();
                  }}
                  className="w-2/3 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Play size={16} />
                  <span>{language === 'uz' ? 'Boshlashni tasdiqlash' : language === 'ru' ? 'Подтвердить начало' : 'Confirm start'}</span>
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (activeJob.status === 'open' || activeJob.status === 'pending') && onDelete ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Trash2 size={18} />
                  <span>{language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all shadow-md flex items-center justify-center"
                >
                  {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all shadow-md"
              >
                {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            )}
          </footer>
        </motion.div>
      </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={language === 'uz' ? "O'chirishni tasdiqlash" : language === 'ru' ? 'Подтвердите удаление' : 'Confirm deletion'}
        message={
          language === 'uz'
            ? "Rostdan ham ushbu e'lonni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi."
            : language === 'ru'
              ? 'Вы действительно хотите удалить эту вакансию? Это действие нельзя отменить.'
              : 'Are you sure you want to delete this job? This action cannot be undone.'
        }
        confirmText={language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}
        cancelText={language === 'uz' ? 'Bekor qilish' : language === 'ru' ? 'Отмена' : 'Cancel'}
        onConfirm={() => {
          onDelete?.(activeJob.id);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AnimatePresence>
  );
};
