import React from 'react';
import { JobSearchModalDetail } from "../search/JobSearchModalDetail";
import { AnimatePresence } from 'motion/react';
import { Job } from '../../../types';
import { useCalendarScreen } from '../../../hooks/useCalendarScreen';
import { getJobTimeRelation } from './CalendarScreen.utils';
import { CalendarAccordion } from './CalendarAccordion';
import { CalendarGridCard } from './CalendarGridCard';

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
    allAppliedJobs,
    allConfirmedJobs,
    allTodoJobs,
    allMissedJobs,
    allCompletedJobs,
    getDayStatus,
    handleDayClick,
    handlePrevMonth,
    handleNextMonth,
  } = useCalendarScreen();

  const toggleAccordion = (name: string) => {
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  const getJobRelation = (job: Job) => {
    return getJobTimeRelation(job, yearFromContext, monthFromContext, dayFromContext);
  };

  return (
    <div className="flex flex-col h-full bg-brand-background">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-16 md:pt-6 pb-28 md:pb-6">
        {/* Main Grid Container: Mobile flex-col, Desktop 12-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto">
          {/* Interactive Month Calendar Grid Card */}
          <div className="lg:col-span-7">
            <CalendarGridCard
              language={language}
              currentYear={currentYear}
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              yearFromContext={yearFromContext}
              monthFromContext={monthFromContext}
              dayFromContext={dayFromContext}
              prevMonthDays={prevMonthDays}
              days={days}
              nextMonthDays={nextMonthDays}
              activeTooltipDay={activeTooltipDay}
              calendarRef={calendarRef}
              jobs={jobs}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              handleDayClick={handleDayClick}
              getDayStatus={getDayStatus}
              setSelectedJob={setSelectedJob}
            />
          </div>

          {/* Category Cards / Accordions Section */}
          <div className="lg:col-span-5">
            <CalendarAccordion
              language={language}
              activeAccordion={activeAccordion}
              toggleAccordion={toggleAccordion}
              allAppliedJobs={allAppliedJobs}
              allConfirmedJobs={allConfirmedJobs}
              allTodoJobs={allTodoJobs}
              allMissedJobs={allMissedJobs}
              allCompletedJobs={allCompletedJobs}
              getJobTimeRelation={getJobRelation}
              setSelectedJob={setSelectedJob}
            />
          </div>
        </div>
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
