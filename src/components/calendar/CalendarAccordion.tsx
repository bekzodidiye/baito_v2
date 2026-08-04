import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { Job } from '../../types';
import { CalendarAccordionItem } from './CalendarAccordionItem';

interface CalendarAccordionProps {
  language: 'uz' | 'ru' | 'en';
  activeAccordion: string | null;
  toggleAccordion: (name: string) => void;
  allAppliedJobs: Job[];
  allConfirmedJobs: Job[];
  allTodoJobs: Job[];
  allCompletedJobs: Job[];
  getJobTimeRelation: (job: Job) => 'past' | 'today' | 'future';
  setSelectedJob: (job: Job) => void;
}

export const CalendarAccordion: React.FC<CalendarAccordionProps> = ({
  language,
  activeAccordion,
  toggleAccordion,
  allAppliedJobs,
  allConfirmedJobs,
  allTodoJobs,
  allCompletedJobs,
  getJobTimeRelation,
  setSelectedJob
}) => {
  return (
    <section className="flex flex-col gap-3">
      {/* Arizadagi ishlar */}
      <CalendarAccordionItem
        id="arizalar"
        activeAccordion={activeAccordion}
        toggleAccordion={toggleAccordion}
        count={allAppliedJobs.length}
        title={language === 'ru' ? 'Работы на рассмотрении' : language === 'en' ? 'Applied Jobs' : 'Arizadagi ishlar'}
        badgeClass="bg-amber-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(146,64,14,0.4),_0_2px_6px_rgba(245,158,11,0.3)]"
        colorClass="bg-amber-50 text-amber-500 border-amber-100/30"
        emptyIcon={<Clock size={13} className="stroke-[2.5]" />}
        emptyText={language === 'ru' ? 'Работы на рассмотрении пока нет.' : language === 'en' ? 'No applied jobs yet.' : 'Hozircha arizadagi ishlar mavjud emas.'}
        jobs={allAppliedJobs}
        setSelectedJob={setSelectedJob}
        renderBadge={() => (
          <span className="shrink-0 bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center">
            {language === 'ru' ? 'Отправлено' : language === 'en' ? 'Applied' : 'Yuborildi'}
          </span>
        )}
      />

      {/* Tasdiqlangan ishlar */}
      <CalendarAccordionItem
        id="tasdiqlangan"
        activeAccordion={activeAccordion}
        toggleAccordion={toggleAccordion}
        count={allConfirmedJobs.length}
        title={language === 'ru' ? 'Подтвержденные работы' : language === 'en' ? 'Confirmed Jobs' : 'Tasdiqlangan ishlar'}
        badgeClass="bg-emerald-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(6,95,70,0.4),_0_2px_6px_rgba(16,185,129,0.3)]"
        colorClass="bg-emerald-50 text-emerald-500 border-emerald-100/30"
        emptyIcon={<CheckCircle2 size={13} className="stroke-[2.5]" />}
        emptyText={language === 'ru' ? 'Подтвержденных работ пока нет.' : language === 'en' ? 'No confirmed jobs yet.' : 'Hozircha tasdiqlangan ishlar mavjud emas.'}
        jobs={allConfirmedJobs}
        setSelectedJob={setSelectedJob}
        renderBadge={() => (
          <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 size={10} />
            {language === 'ru' ? 'Подтверждено' : language === 'en' ? 'Confirmed' : 'Tasdiqlandi'}
          </span>
        )}
      />

      {/* Qilinadigan ish */}
      <CalendarAccordionItem
        id="hisobotlar"
        activeAccordion={activeAccordion}
        toggleAccordion={toggleAccordion}
        count={allTodoJobs.length}
        title={language === 'ru' ? 'Задачи к выполнению' : language === 'en' ? 'Tasks To Do' : 'Qilinadigan ish'}
        badgeClass="bg-rose-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(159,18,57,0.4),_0_2px_6px_rgba(244,63,94,0.3)]"
        colorClass="bg-rose-50 text-rose-500 border-rose-100/30"
        emptyIcon={<AlertCircle size={13} className="stroke-[2.5]" />}
        emptyText={language === 'ru' ? 'Задач к выполнению пока нет.' : language === 'en' ? 'No tasks to do yet.' : 'Hisobotlar mavjud emas.'}
        jobs={allTodoJobs}
        setSelectedJob={setSelectedJob}
        renderBadge={(job) => {
          if (job.status === 'in_progress' || job.status === 'start_requested') {
            return (
              <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} />
                Ish boshlandi
              </span>
            );
          }
          return (
            <span className="shrink-0 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <AlertCircle size={10} />
              {language === 'ru' ? 'Готово к началу' : language === 'en' ? 'Ready to start' : 'Boshlashga tayyor'}
            </span>
          );
        }}
      />

      {/* Tugallangan ishlar */}
      <CalendarAccordionItem
        id="tugallangan"
        activeAccordion={activeAccordion}
        toggleAccordion={toggleAccordion}
        count={allCompletedJobs.length}
        title={language === 'ru' ? 'Завершенные работы' : language === 'en' ? 'Completed Jobs' : 'Tugallangan ishlar'}
        badgeClass="bg-brand-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1.5px_2.5px_rgba(0,0,0,0.4),_0_2px_6px_rgba(0,6,102,0.3)]"
        colorClass="bg-indigo-50 text-brand-primary border-indigo-100/30"
        emptyIcon={<Star size={13} className="stroke-[2.5]" />}
        emptyText={language === 'ru' ? 'Завершенных работ пока нет.' : language === 'en' ? 'No completed jobs yet.' : 'Tugallangan ishlar mavjud emas.'}
        jobs={allCompletedJobs}
        setSelectedJob={setSelectedJob}
        renderBadge={() => (
          <span className="shrink-0 bg-indigo-50 text-brand-primary border border-indigo-100 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={10} className="fill-current" />
            {language === 'ru' ? 'Успешно завершено' : language === 'en' ? 'Successfully completed' : 'Muvaffaqiyatli yakunlandi'}
          </span>
        )}
      />
    </section>
  );
};
