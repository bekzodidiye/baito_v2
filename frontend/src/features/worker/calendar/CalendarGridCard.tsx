import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS_TRANSLATIONS, WEEKDAYS_TRANSLATIONS } from './CalendarScreen.utils';
import { CalendarDayButton } from './CalendarDayButton';
import { CalendarLegend } from './CalendarLegend';
import { Job } from '../../../types';

interface CalendarGridCardProps {
  language: 'uz' | 'ru' | 'en';
  currentYear: number;
  currentMonth: number;
  selectedDay: number;
  yearFromContext: number;
  monthFromContext: number;
  dayFromContext: number;
  prevMonthDays: number[];
  days: number[];
  nextMonthDays: number[];
  activeTooltipDay: number | null;
  calendarRef: React.RefObject<HTMLDivElement | null>;
  jobs: Job[];
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleDayClick: (day: number) => void;
  getDayStatus: (day: number) => 'applied' | 'confirmed' | 'todo' | 'completed' | 'missed' | null;
  setSelectedJob: (job: Job | null) => void;
}

export const CalendarGridCard: React.FC<CalendarGridCardProps> = ({
  language,
  currentYear,
  currentMonth,
  selectedDay,
  yearFromContext,
  monthFromContext,
  dayFromContext,
  prevMonthDays,
  days,
  nextMonthDays,
  activeTooltipDay,
  calendarRef,
  jobs,
  handlePrevMonth,
  handleNextMonth,
  handleDayClick,
  getDayStatus,
  setSelectedJob,
}) => {
  const monthName = MONTHS_TRANSLATIONS[language][currentMonth];
  const weekdays = WEEKDAYS_TRANSLATIONS[language];

  return (
    <div
      ref={calendarRef}
      className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      {/* SVG 3D Star filter definition */}
      <svg width="0" height="0" className="absolute opacity-0 pointer-events-none">
        <defs>
          <filter id="star-3d" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.25" />
          </filter>
        </defs>
      </svg>

      {/* Month & Navigation Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-base font-black text-slate-900 tracking-tight">
          {language === 'ru'
            ? `${monthName} ${currentYear}`
            : language === 'en'
            ? `${monthName} ${currentYear}`
            : `${currentYear}-yil ${monthName}`}
        </h2>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label="Oldingi oy"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label="Keyingi oy"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Labels Row */}
      <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
        {weekdays.map((wd) => (
          <div key={wd} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center items-center justify-items-center">
        {/* Previous Month Days (Muted) */}
        {prevMonthDays.map((d, i) => (
          <div key={`prev-${i}`} className="w-9 h-9 flex items-center justify-center text-xs font-bold text-slate-300 select-none">
            {d}
          </div>
        ))}

        {/* Current Month Days */}
        {days.map((d, i) => {
          const isSelected = selectedDay === d;
          const isToday =
            currentYear === yearFromContext &&
            currentMonth === monthFromContext - 1 &&
            d === dayFromContext;
          const status = getDayStatus(d);
          const slotIndex = prevMonthDays.length + i;

          return (
            <CalendarDayButton
              key={`day-${d}`}
              day={d}
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

        {/* Next Month Days (Muted) */}
        {nextMonthDays.map((d, i) => (
          <div key={`next-${i}`} className="w-9 h-9 flex items-center justify-center text-xs font-bold text-slate-300 select-none">
            {d}
          </div>
        ))}
      </div>

      {/* Legend */}
      <CalendarLegend language={language} />
    </div>
  );
};
