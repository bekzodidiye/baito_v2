import React from 'react';
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../../types';

interface CalendarAccordionProps {
  language: 'uz' | 'ru' | 'en';
  activeAccordion: string | null;
  toggleAccordion: (name: string) => void;
  allAppliedJobs: Job[];
  allConfirmedJobs: Job[];
  allTodoJobs: Job[];
  allCompletedJobs: Job[];
  renderJobCard: (job: Job, badge: React.ReactNode) => React.ReactNode;
  getJobTimeRelation: (job: Job) => 'past' | 'today' | 'future';
}

export const CalendarAccordion: React.FC<CalendarAccordionProps> = ({
  language,
  activeAccordion,
  toggleAccordion,
  allAppliedJobs,
  allConfirmedJobs,
  allTodoJobs,
  allCompletedJobs,
  renderJobCard,
  getJobTimeRelation
}) => {
  return (
    <section className="flex flex-col gap-3">
      {/* Arizadagi ishlar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 overflow-hidden">
        <button
          onClick={() => toggleAccordion('arizalar')}
          className="w-full p-4 flex items-center justify-between font-display font-bold text-sm text-brand-text hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="bg-amber-500 text-white font-extrabold text-[11px] w-6 h-6 flex items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(146,64,14,0.4),_0_2px_6px_rgba(245,158,11,0.3)] select-none">
              {allAppliedJobs.length}
            </span>
            <span>{language === 'ru' ? 'Работы на рассмотрении' : language === 'en' ? 'Applied Jobs' : 'Arizadagi ishlar'}</span>
          </div>
          <ChevronRight
            size={18}
            className={`text-brand-outline-variant transition-transform ${
              activeAccordion === 'arizalar' ? 'rotate-90 text-brand-text' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {activeAccordion === 'arizalar' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-brand-surface-low"
            >
              <div className="p-4 flex flex-col gap-2">
                {allAppliedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3.5 px-3 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/60 text-center select-none animate-fade-in my-0.5">
                    <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-1 border border-amber-100/30">
                      <Clock size={13} className="stroke-[2.5]" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 max-w-[220px] leading-normal font-sans">
                      {language === 'ru' ? 'Работы на рассмотрении пока нет.' : language === 'en' ? 'No applied jobs yet.' : 'Hozircha arizadagi ishlar mavjud emas.'}
                    </p>
                  </div>
                ) : (
                  allAppliedJobs.map(job => renderJobCard(job, 
                    <span className="shrink-0 bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center">
                      {language === 'ru' ? 'Отправлено' : language === 'en' ? 'Applied' : 'Yuborildi'}
                    </span>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tasdiqlangan ishlar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 overflow-hidden">
        <button
          onClick={() => toggleAccordion('tasdiqlangan')}
          className="w-full p-4 flex items-center justify-between font-display font-bold text-sm text-brand-text hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-white font-extrabold text-[11px] w-6 h-6 flex items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(6,95,70,0.4),_0_2px_6px_rgba(16,185,129,0.3)] select-none">
              {allConfirmedJobs.length}
            </span>
            <span>{language === 'ru' ? 'Подтвержденные работы' : language === 'en' ? 'Confirmed Jobs' : 'Tasdiqlangan ishlar'}</span>
          </div>
          <ChevronRight
            size={18}
            className={`text-brand-outline-variant transition-transform ${
              activeAccordion === 'tasdiqlangan' ? 'rotate-90 text-brand-text' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {activeAccordion === 'tasdiqlangan' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-brand-surface-low"
            >
              <div className="p-4 flex flex-col gap-2">
                {allConfirmedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3.5 px-3 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/60 text-center select-none animate-fade-in my-0.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-1 border border-emerald-100/30">
                      <CheckCircle2 size={13} className="stroke-[2.5]" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 max-w-[220px] leading-normal font-sans">
                      {language === 'ru' ? 'Подтвержденных работ пока нет.' : language === 'en' ? 'No confirmed jobs yet.' : 'Hozircha tasdiqlangan ishlar mavjud emas.'}
                    </p>
                  </div>
                ) : (
                  allConfirmedJobs.map(job => renderJobCard(job, 
                    <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      {language === 'ru' ? 'Подтверждено' : language === 'en' ? 'Confirmed' : 'Tasdiqlandi'}
                    </span>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Qilinadigan ish */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 overflow-hidden">
        <button
          onClick={() => toggleAccordion('hisobotlar')}
          className="w-full p-4 flex items-center justify-between font-display font-bold text-sm text-brand-text hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="bg-rose-500 text-white font-extrabold text-[11px] w-6 h-6 flex items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(159,18,57,0.4),_0_2px_6px_rgba(244,63,94,0.3)] select-none">
              {allTodoJobs.length}
            </span>
            <span>{language === 'ru' ? 'Задачи к выполнению' : language === 'en' ? 'Tasks To Do' : 'Qilinadigan ish'}</span>
          </div>
          <ChevronRight
            size={18}
            className={`text-brand-outline-variant transition-transform ${
              activeAccordion === 'hisobotlar' ? 'rotate-90 text-brand-text' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {activeAccordion === 'hisobotlar' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-brand-surface-low"
            >
              <div className="p-4 flex flex-col gap-2">
                {allTodoJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3.5 px-3 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/60 text-center select-none animate-fade-in my-0.5">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-1 border border-rose-100/30">
                      <AlertCircle size={13} className="stroke-[2.5]" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 max-w-[220px] leading-normal font-sans">
                      {language === 'ru' ? 'Задач к выполнению пока нет.' : language === 'en' ? 'No tasks to do yet.' : 'Hisobotlar mavjud emas.'}
                    </p>
                  </div>
                ) : (
                  allTodoJobs.map(job => renderJobCard(job, 
                    getJobTimeRelation(job) === 'past'
                    ? <span className="shrink-0 bg-rose-50 text-rose-700 border border-dashed border-rose-400 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 opacity-90"><AlertCircle size={10} />{language === 'ru' ? 'Пропущено?' : language === 'en' ? 'Missed?' : 'O\'tkazib yuborildi'}</span>
                    : <span className="shrink-0 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><AlertCircle size={10} />{language === 'ru' ? 'Готово к началу' : language === 'en' ? 'Ready to start' : 'Boshlashga tayyor'}</span>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tugallangan ishlar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-300 overflow-hidden">
        <button
          onClick={() => toggleAccordion('tugallangan')}
          className="w-full p-4 flex items-center justify-between font-display font-bold text-sm text-brand-text hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="bg-brand-primary text-white font-extrabold text-[11px] w-6 h-6 flex items-center justify-center rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(0,0,0,0.4),_0_2px_6px_rgba(0,6,102,0.3)] select-none">
              {allCompletedJobs.length}
            </span>
            <span>{language === 'ru' ? 'Завершенные работы' : language === 'en' ? 'Completed Jobs' : 'Tugallangan ishlar'}</span>
          </div>
          <ChevronRight
            size={18}
            className={`text-brand-outline-variant transition-transform ${
              activeAccordion === 'tugallangan' ? 'rotate-90 text-brand-text' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {activeAccordion === 'tugallangan' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-brand-surface-low"
            >
              <div className="p-4 flex flex-col gap-2">
                {allCompletedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3.5 px-3 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/60 text-center select-none animate-fade-in my-0.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-brand-primary mb-1 border border-indigo-100/30">
                      <Star size={13} className="stroke-[2.5]" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 max-w-[220px] leading-normal font-sans">
                      {language === 'ru' ? 'Завершенных работ пока нет.' : language === 'en' ? 'No completed jobs yet.' : 'Tugallangan ishlar mavjud emas.'}
                    </p>
                  </div>
                ) : (
                  allCompletedJobs.map(job => renderJobCard(job, 
                    <span className="shrink-0 bg-indigo-50 text-brand-primary border border-indigo-100 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={10} className="fill-current" />
                      {language === 'ru' ? 'Успешно завершено' : language === 'en' ? 'Successfully completed' : 'Muvaffaqiyatli yakunlandi'}
                    </span>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
