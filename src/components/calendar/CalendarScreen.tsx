import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { JobSearchModalDetail } from "../search/JobSearchModalDetail";
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../../types';
import { useCalendarScreen } from '../../hooks/useCalendarScreen';
import { MONTHS_TRANSLATIONS, WEEKDAYS_TRANSLATIONS, getJobTimeRelation } from './CalendarScreen.utils';
import { CalendarLegend } from './CalendarLegend';
import { CalendarDayButton } from './CalendarDayButton';
import { CalendarAccordion } from './CalendarAccordion';

export const CalendarScreen: React.FC = () => {
  const {
    jobs,
    language,
    toggleBookmark,
    applyToJob,
    activeAccordion,
    setActiveAccordion,
    selectedJob,
    setSelectedJob,
    yearFromContext,
    monthFromContext,
    dayFromContext,
    currentYear,
    currentMonth,
    selectedDay,
    activeTooltipDay,
    calendarRef,
    prevMonthDays,
    days,
    nextMonthDays,
    currentDayJobs,
    allAppliedJobs,
    allConfirmedJobs,
    allTodoJobs,
    allCompletedJobs,
    getDayStatus,
    handleDayClick,
    handlePrevMonth,
    handleNextMonth,
    startDayOfWeek
  } = useCalendarScreen();

  const toggleAccordion = (name: string) => {
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  const getJobRelation = (job: Job) => {
    return getJobTimeRelation(job, yearFromContext, monthFromContext, dayFromContext);
  };

  const renderJobCard = (job: Job, badge: React.ReactNode) => (
    <button 
      key={job.id} 
      onClick={() => setSelectedJob(job)} 
      className="w-full text-left p-3.5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex flex-col gap-2"
    >
      <div className="flex justify-between items-start gap-3 w-full">
        <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">{job.title}</p>
        {badge}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-0.5 w-full">
        <div className="flex items-center gap-2 flex-1 min-w-[100px]">
          <p className="text-[11px] text-slate-500 font-medium truncate">{job.company}</p>
          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
          <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{job.time}</p>
        </div>
        {job.periodText && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
            <Calendar size={10} className="text-slate-400" />
            {job.periodText.split(' ')[0]}
          </p>
        )}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 pb-20 pt-16 md:pt-4 max-w-6xl mx-auto w-full px-2 items-start">
      {/* 3D Star definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="star-3d" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" result="drop-shadow" />
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shift-down" />
            <feComposite operator="out" in="SourceAlpha" in2="shift-down" result="top-edge" />
            <feGaussianBlur stdDeviation="1" in="top-edge" result="top-edge-blur" />
            <feFlood floodColor="#ffffff" floodOpacity="0.9" />
            <feComposite operator="in" in2="top-edge-blur" result="top-highlight" />
            <feComposite operator="in" in="top-highlight" in2="SourceAlpha" result="top-highlight-clipped" />
            <feOffset dx="0" dy="-2" in="SourceAlpha" result="shift-up" />
            <feComposite operator="out" in="SourceAlpha" in2="shift-up" result="bottom-edge" />
            <feGaussianBlur stdDeviation="1" in="bottom-edge" result="bottom-edge-blur" />
            <feFlood floodColor="#1e1b4b" floodOpacity="0.6" />
            <feComposite operator="in" in2="bottom-edge-blur" result="bottom-shadow" />
            <feComposite operator="in" in="bottom-shadow" in2="SourceAlpha" result="bottom-shadow-clipped" />
            <feMerge>
              <feMergeNode in="drop-shadow" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="top-highlight-clipped" />
              <feMergeNode in="bottom-shadow-clipped" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Left Column: Calendar Grid */}
      <div className="lg:col-span-7 flex flex-col gap-4 w-full">
        {/* Calendar Grid Section */}
        <section ref={calendarRef} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-bold text-slate-800">
              {language === 'ru' 
                ? `${MONTHS_TRANSLATIONS['ru'][currentMonth]} ${currentYear} г.` 
                : language === 'en' 
                  ? `${MONTHS_TRANSLATIONS['en'][currentMonth]} ${currentYear}` 
                  : `${currentYear}-yil ${MONTHS_TRANSLATIONS['uz'][currentMonth]}`
              }
            </h2>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center mb-2 border-b border-slate-100 pb-2">
            {WEEKDAYS_TRANSLATIONS[language].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 font-display">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 text-center gap-y-3">
            {prevMonthDays.map(day => (
              <div key={`prev-${day}`} className="flex items-center justify-center p-1">
                <span className="text-xs font-semibold text-slate-300 select-none">{day}</span>
              </div>
            ))}

            {days.map(day => {
              const isSelected = selectedDay === day;
              const isToday = currentYear === yearFromContext && currentMonth === (monthFromContext - 1) && day === dayFromContext;
              const status = getDayStatus(day);
              const slotIndex = startDayOfWeek + day - 1;

              return (
                <CalendarDayButton
                  key={day}
                  day={day}
                  isSelected={isSelected}
                  isToday={isToday}
                  status={status}
                  activeTooltipDay={activeTooltipDay}
                  handleDayClick={handleDayClick}
                  jobs={jobs}
                  language={language}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  yearFromContext={yearFromContext}
                  monthFromContext={monthFromContext}
                  dayFromContext={dayFromContext}
                  slotIndex={slotIndex}
                  setSelectedJob={setSelectedJob}
                />
              );
            })}

            {nextMonthDays.map(day => (
              <div key={`next-${day}`} className="flex items-center justify-center p-1">
                <span className="text-xs font-semibold text-slate-300 select-none">{day}</span>
              </div>
            ))}
          </div>

          <CalendarLegend language={language} />
        </section>
      </div>

      {/* Right Column: Selected Day Jobs & Accordion */}
      <div className="lg:col-span-5 flex flex-col gap-4 w-full">
        {/* Selected Day Jobs List */}
        {currentDayJobs.length > 0 && (
          <section className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-display font-bold text-sm text-brand-text">
                {selectedDay} - {MONTHS_TRANSLATIONS[language][currentMonth]} {currentYear}{language === 'ru' ? ' года' : ''}
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {currentDayJobs.map(job => {
                let badge = null;
                if (job.status === 'completed') {
                  badge = <span className="shrink-0 bg-indigo-50 text-brand-primary border border-indigo-100 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} className="fill-current" />{language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Tugallandi'}</span>;
                } else if (job.status === 'confirmed' || job.status === 'todo') {
                  const relation = getJobRelation(job);
                  if (relation === 'future') {
                    badge = <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} />{language === 'ru' ? 'Подтверждено' : language === 'en' ? 'Confirmed' : 'Tasdiqlandi'}</span>;
                  } else if (relation === 'past') {
                    badge = <span className="shrink-0 bg-rose-50 text-rose-700 border border-dashed border-rose-400 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 opacity-90"><AlertCircle size={10} />{language === 'ru' ? 'Пропущено?' : language === 'en' ? 'Missed?' : 'O\'tkazib yuborildi'}</span>;
                  } else {
                    badge = <span className="shrink-0 bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><AlertCircle size={10} />{language === 'ru' ? 'Готово к началу' : language === 'en' ? 'Ready to start' : 'Boshlashga tayyor'}</span>;
                  }
                } else if (job.status === 'applied' || job.applied) {
                  badge = <span className="shrink-0 bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center">{language === 'ru' ? 'Отправлено' : language === 'en' ? 'Applied' : 'Yuborildi'}</span>;
                }
                return renderJobCard(job, badge);
              })}
            </div>
          </section>
        )}

        {/* Accordions Section */}
        <CalendarAccordion
          language={language}
          activeAccordion={activeAccordion}
          toggleAccordion={toggleAccordion}
          allAppliedJobs={allAppliedJobs}
          allConfirmedJobs={allConfirmedJobs}
          allTodoJobs={allTodoJobs}
          allCompletedJobs={allCompletedJobs}
          renderJobCard={renderJobCard}
          getJobTimeRelation={getJobRelation}
        />
      </div>

      <AnimatePresence>
        {selectedJob && (
          <JobSearchModalDetail 
            selectedJob={selectedJob} 
            setSelectedJob={setSelectedJob} 
            toggleBookmark={toggleBookmark} 
            applyToJob={applyToJob} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
