import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ChevronRight, Phone } from 'lucide-react';
import { Job } from '../../types';
import { getJobDetails } from '../../utils/jobDetailHelpers';
import { getJobLocalizedFields } from '../../utils/jobTranslationUtils';
import { JobDetailsHeader } from '../../components/job-details/JobDetailsHeader';
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
  onDelete,
  onConfirmStart,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [job?.id]);

  if (!job) return null;

  const localized = getJobLocalizedFields(job, language);
  const fallbackDetails = getJobDetails(localized.title, language);

  const tasks = localized.responsibilities
    ? localized.responsibilities.split('\n').filter(Boolean)
    : fallbackDetails.tasks;

  const requirements = localized.requirements
    ? localized.requirements.split('\n').filter(Boolean)
    : fallbackDetails.requirements;

  const warning = localized.importantNote || fallbackDetails.warning;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 26,
            stiffness: 240,
          }}
          className="relative bg-slate-50 w-full sm:w-[480px] sm:max-w-[92vw] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[88vh] sm:h-[85vh] max-h-[92vh] overflow-hidden z-10 pointer-events-auto border border-slate-200/80 mb-0 [transform:translateZ(0)] text-slate-900"
        >
          {/* Header */}
          <JobDetailsHeader selectedJob={job} onClose={onClose} />

          {/* Scrollable Content Area */}
          <div ref={modalScrollRef} className="flex-1 overflow-y-auto no-scrollbar">
            {/* Hero Image Section */}
            <JobDetailsHero selectedJob={job} />

            {/* Overlapping Content Container */}
            <div className="px-3 sm:px-4 -mt-6 relative z-10 pb-6 space-y-3">
              <JobDetailsCard selectedJob={job} />
              <JobDetailsLocation selectedJob={job} />
              <JobDetailsTasks tasks={tasks} />
              <JobDetailsRequirements requirements={requirements} warning={warning} />

              {/* Accepted Workers Section for Employer */}
              {(job.hiredWorkers || []).length > 0 && (
                <section className="bg-white rounded-xl p-3.5 sm:p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-brand-primary">
                      {language === 'ru' ? 'Принятые работники' : language === 'en' ? 'Hired workers' : 'Qabul qilingan ishchilar'}
                    </h3>
                    <span className="text-xs font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {job.hiredWorkers!.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {job.hiredWorkers!.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
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
                          <div>
                            <h5 className="font-bold text-brand-primary text-sm">{worker.name}</h5>
                            {worker.phone && (
                              <p className="text-xs text-slate-500 font-medium">{worker.phone}</p>
                            )}
                          </div>
                        </div>
                        {worker.phone && (
                          <a
                            href={`tel:${worker.phone}`}
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-600 flex items-center justify-center transition-colors shadow-xs"
                            title={language === 'ru' ? 'Позвонить' : language === 'en' ? 'Call' : "Qo'ng'iroq qilish"}
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Action Footer for Employer */}
          <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 sm:p-4 shrink-0 flex items-center gap-3">
            {(job.status === 'open' || job.status === 'pending') && onDelete ? (
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
            ) : job.status === 'start_requested' && onConfirmStart ? (
              <>
                <button
                  onClick={onClose}
                  className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all"
                >
                  {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    onConfirmStart(job.id);
                    onClose();
                  }}
                  className="w-2/3 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <span>{language === 'uz' ? 'Boshlashni tasdiqlash' : language === 'ru' ? 'Подтвердить начало' : 'Confirm start'}</span>
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-[0.98] transition-all shadow-md"
              >
                {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            )}
          </footer>
        </motion.div>
      </div>

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
          onDelete?.(job.id);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AnimatePresence>
  );
};
