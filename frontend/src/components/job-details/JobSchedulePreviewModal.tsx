import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Job } from '../../types';
import { parseWorkDates, toIsoDate } from '../../utils/workDates';
import { getJobShiftTime, getJobShiftHours } from '../../utils/jobTimeUtils';
import { MONTHS_TRANSLATIONS, WEEKDAYS_TRANSLATIONS, formatLongDate } from '../../utils/dateFormat';
import { useAuthStore } from '../../store/useAuthStore';

interface JobSchedulePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

export const JobSchedulePreviewModal: React.FC<JobSchedulePreviewModalProps> = ({
  isOpen,
  onClose,
  job
}) => {
  const language = useAuthStore(s => s.language);

  // 1. Parse active work dates
  const workDates = React.useMemo(() => {
    const dates = parseWorkDates(job.workDate);
    if (dates.length > 0) return dates;
    // Fallback if workDate empty or unparseable: try job.time or today
    const fallbackDates = parseWorkDates(job.time);
    if (fallbackDates.length > 0) return fallbackDates;
    return [toIsoDate(new Date())];
  }, [job.workDate, job.time]);

  // Initial displayed month/year based on the first shift date
  const initialDate = React.useMemo(() => {
    if (workDates.length > 0) {
      const parts = workDates[0].split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, parts[2] || 1);
      }
    }
    return new Date();
  }, [workDates]);

  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());

  // Reset month/year when modal opens or job changes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentMonth(initialDate.getMonth());
      setCurrentYear(initialDate.getFullYear());
    }
  }, [isOpen, initialDate]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 2. Parse shift times
  const shiftTimeStr = getJobShiftTime(job);
  const shiftHours = getJobShiftHours(job);

  const timeMatch = shiftTimeStr.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
  const startHour = timeMatch ? parseInt(timeMatch[1], 10) : 9;
  const startMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;
  const endHour = timeMatch ? parseInt(timeMatch[3], 10) : 18;
  const endMin = timeMatch ? parseInt(timeMatch[4], 10) : 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  const startFormatted = `${pad(startHour)}:${pad(startMin)}`;
  const endFormatted = `${pad(endHour)}:${pad(endMin)}`;

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Calendar math (Monday-based)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // 0 for Monday

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Work dates set for lookup
  const workDatesSet = React.useMemo(() => new Set(workDates), [workDates]);

  // Clock calculations (12-hour analog face)
  const cx = 90;
  const cy = 90;
  const r = 70;

  const startAngle = ((startHour % 12) + startMin / 60) * 30;
  const endAngle = ((endHour % 12) + endMin / 60) * 30;

  const toCoords = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  };

  const arcStart = toCoords(startAngle, r);
  const arcEnd = toCoords(endAngle, r);

  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += 360;
  if (sweep === 0 && shiftHours > 0) sweep = 360;

  const largeArcFlag = sweep > 180 ? 1 : 0;
  const arcPath =
    sweep >= 359
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
      : `M ${cx} ${cy} L ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${arcEnd.x} ${arcEnd.y} Z`;

  // Start & End hand endpoints
  const startHand = toCoords(startAngle, 50);
  const endHand = toCoords(endAngle, 50);

  // Translations dictionary
  const modalTexts = {
    uz: {
      title: "Ish jadvali va smena vaqti",
      readOnlyBadge: "Faqat ko'rish uchun",
      subTitle: "Belgilangan ish kunlari va ish soatlari",
      activeDaysCount: "{count} ta ish kuni belgilangan",
      startTime: "Boshlanish vaqti",
      endTime: "Tugash vaqti",
      duration: "Smena davomiyligi",
      hours: "soat",
      timelineTitle: "24 soatlik kun tartibi",
      close: "Yopish",
      overnight: "Tungi smena"
    },
    ru: {
      title: "График работы и время смены",
      readOnlyBadge: "Только для просмотра",
      subTitle: "Установленные рабочие дни и часы работы",
      activeDaysCount: "Выбрано рабочих дней: {count}",
      startTime: "Время начала",
      endTime: "Время окончания",
      duration: "Длительность смены",
      hours: "ч.",
      timelineTitle: "24-часовой график дня",
      close: "Закрыть",
      overnight: "Ночная смена"
    },
    en: {
      title: "Work Schedule & Shift Hours",
      readOnlyBadge: "View only",
      subTitle: "Assigned work days and shift timeline",
      activeDaysCount: "{count} work day(s) scheduled",
      startTime: "Start time",
      endTime: "End time",
      duration: "Shift duration",
      hours: "hrs",
      timelineTitle: "24-Hour Timeline",
      close: "Close",
      overnight: "Overnight shift"
    }
  }[language];

  // 24h timeline bar calculation
  const startRatio = ((startHour * 60 + startMin) / 1440) * 100;
  const durationRatio = (shiftHours / 24) * 100;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-brand-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold shadow-inner">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="schedule-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {modalTexts.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Info size={11} />
                      {modalTexts.readOnlyBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{modalTexts.subTitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={modalTexts.close}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 bg-slate-50/50">
              {/* LEFT: Interactive Calendar Grid */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  {/* Calendar Month Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-slate-900 select-none">
                      {MONTHS_TRANSLATIONS[language][currentMonth]} {currentYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {WEEKDAYS_TRANSLATIONS[language].map((dayName, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold py-1 select-none ${
                          idx >= 5 ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      >
                        {dayName}
                      </span>
                    ))}
                  </div>

                  {/* Month Grid Cells */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="h-8 w-8" />;
                      }

                      const iso = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
                      const isWorkDay = workDatesSet.has(iso);

                      const todayIso = toIsoDate(new Date());
                      const isToday = iso === todayIso;

                      return (
                        <div
                          key={`day-${day}`}
                          className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs transition-all relative ${
                            isWorkDay
                              ? 'bg-brand-primary text-white font-black shadow-md shadow-brand-primary/20 scale-105'
                              : isToday
                              ? 'border border-brand-primary/40 text-brand-primary font-bold bg-brand-primary/10'
                              : 'text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          {day}
                          {isWorkDay && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Footer Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <Sparkles size={13} />
                    <span>{modalTexts.activeDaysCount.replace('{count}', String(workDates.length))}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {workDates.length > 0 ? formatLongDate(workDates[0], language) : ''}
                  </span>
                </div>
              </div>

              {/* RIGHT: Visual Clock & Shift Hours */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between">
                {/* Analog Clock Diagram */}
                <div className="relative flex items-center justify-center my-2">
                  <svg width="180" height="180" viewBox="0 0 180 180" className="drop-shadow-sm select-none">
                    {/* Dial Base */}
                    <circle cx={cx} cy={cy} r={r} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="3" />

                    {/* Shift Arc Highlight */}
                    <path
                      d={arcPath}
                      fill="rgba(37, 99, 235, 0.18)"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />

                    {/* Clock Hour Numbers */}
                    <text x={cx} y={cy - r + 16} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748B">12</text>
                    <text x={cx + r - 12} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748B">3</text>
                    <text x={cx} y={cy + r - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748B">6</text>
                    <text x={cx - r + 12} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748B">9</text>

                    {/* Shift Start Hand (Green) */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={startHand.x}
                      y2={startHand.y}
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Shift End Hand (Indigo/Blue) */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={endHand.x}
                      y2={endHand.y}
                      stroke="#2563EB"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Clock Center Pin */}
                    <circle cx={cx} cy={cy} r="4.5" fill="#1E293B" />
                    <circle cx={cx} cy={cy} r="2" fill="#FFFFFF" />
                  </svg>

                  {/* Centered Shift Duration Floating Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md border border-slate-200 text-center">
                      <span className="text-[10px] font-black text-brand-primary block leading-none">
                        {shiftHours} {modalTexts.hours}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shift Digital Badges */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-800 mb-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {modalTexts.startTime}
                    </div>
                    <span className="text-base font-black text-emerald-900 tracking-tight">
                      {startFormatted}
                    </span>
                  </div>

                  <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-brand-primary mb-0.5">
                      <div className="w-2 h-2 rounded-full bg-brand-primary" />
                      {modalTexts.endTime}
                    </div>
                    <span className="text-base font-black text-brand-primary tracking-tight">
                      {endFormatted}
                    </span>
                  </div>
                </div>

                {/* 24-Hour Day Timeline */}
                <div className="w-full mt-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>00:00</span>
                    <span className="text-slate-600 font-semibold">{modalTexts.timelineTitle}</span>
                    <span>24:00</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-brand-primary rounded-full"
                      style={{
                        left: `${Math.min(100, Math.max(0, startRatio))}%`,
                        width: `${Math.min(100 - startRatio, Math.max(2, durationRatio))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClockIcon size={14} className="text-slate-400" />
                <span>
                  {startFormatted} - {endFormatted} ({shiftHours} {modalTexts.hours})
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {modalTexts.close}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
