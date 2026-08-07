import { useState, useEffect, useRef } from 'react';


import { useApp } from '../context/AppContext';
import { useJobsData } from "../context/useJobsData";
import { Job } from '../types';
import { getTranslatedJob } from '../jobTranslations';
import { 
  isJobOnDay, 
  getJobTimeRelation, 
  isOverlappingWithActiveJob, 
  getDayStatusForList
} from '../features/worker/calendar/CalendarScreen.utils';

export function useCalendarScreen() {
  const { activeCalendarFilter, setActiveCalendarFilter, language, activeCalendarDay } = useApp();
  const { jobs: rawJobs, toggleBookmark, applyToJob } = useJobsData();

  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Parse activeCalendarDay (YYYY-MM-DD)
  const [yearFromContext, monthFromContext, dayFromContext] = activeCalendarDay.split('-').map(Number);
  
  const [currentYear, setCurrentYear] = useState<number>(yearFromContext || 2026);
  const [currentMonth, setCurrentMonth] = useState<number>((monthFromContext - 1) || 5); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number>(dayFromContext || 10);
  const [activeTooltipDay, setActiveTooltipDay] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sync state with context
  useEffect(() => {
    setCurrentYear(yearFromContext);
    setCurrentMonth(monthFromContext - 1);
    setSelectedDay(dayFromContext);
  }, [activeCalendarDay, yearFromContext, monthFromContext, dayFromContext]);

  const jobs = rawJobs.map(j => getTranslatedJob(j, language));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setActiveTooltipDay(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const getDayStatus = (day: number): 'applied' | 'confirmed' | 'todo' | 'completed' | 'missed' | null => {
    return getDayStatusForList(day, jobs, currentYear, currentMonth, yearFromContext, monthFromContext, dayFromContext);
  };

  const handleDayClick = (day: number) => {
    try {
      setSelectedDay(day);
      const status = getDayStatus(day);
      
      if (status) {
        setActiveTooltipDay(prev => prev === day ? null : day);
      } else {
        setActiveTooltipDay(null);
      }

      if (status === 'applied') {
        setActiveAccordion('arizalar');
      } else if (status === 'confirmed') {
        setActiveAccordion('tasdiqlangan');
      } else if (status === 'todo') {
        setActiveAccordion('hisobotlar');
      } else if (status === 'completed') {
        setActiveAccordion('tugallangan');
      }
    } catch (error) {
      console.error('Error handling day click:', error);
    }
  };

  const handlePrevMonth = () => {
    setActiveTooltipDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDay(1); // default to first day when changing month
  };

  const handleNextMonth = () => {
    setActiveTooltipDay(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDay(1); // default to first day when changing month
  };

  // Generate calendar days dynamically
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  
  // Empty slots / previous month days to pad the start
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = Array.from(
    { length: startDayOfWeek }, 
    (_, i) => daysInPrevMonth - startDayOfWeek + i + 1
  );

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Remaining slots to make full rows (multiples of 7)
  const totalSlotsSoFar = startDayOfWeek + daysInMonth;
  const totalSlotsNeeded = totalSlotsSoFar <= 35 ? 35 : 42;
  const nextMonthDaysCount = totalSlotsNeeded - totalSlotsSoFar;
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => i + 1);

  // Filter jobs by their status categories for the calendar list (filtered by selected day)
  let currentDayJobs = jobs?.filter(j => {
    if (j.status === 'none' && !j.applied) return false;
    const isOnDay = isJobOnDay(j, selectedDay, currentYear, currentMonth);
    return isOnDay;
  }) || [];

  const hasActiveJobInCurrentDay = currentDayJobs.some(j => ['confirmed', 'todo', 'completed', 'hired', 'in_progress', 'start_requested'].includes(j.status));
  if (hasActiveJobInCurrentDay) {
    currentDayJobs = currentDayJobs.filter(j => ['confirmed', 'todo', 'completed', 'hired', 'in_progress', 'start_requested'].includes(j.status)).slice(0, 1);
  }

  const allAppliedJobs = jobs?.filter(j => {
    if (['confirmed', 'todo', 'hired', 'in_progress', 'completed', 'start_requested'].includes(j.status)) {
      return false;
    }
    return Boolean(j.status === 'applied' || j.applied);
  }) || [];

  const allConfirmedJobs = jobs?.filter(j => {
    if (!['confirmed', 'todo', 'hired', 'in_progress', 'start_requested'].includes(j.status)) return false;
    const relation = getJobTimeRelation(j, yearFromContext, monthFromContext, dayFromContext);
    return relation === 'future'; 
  }) || [];

  const allTodoJobs = jobs?.filter(j => {
    if (!['confirmed', 'todo', 'hired', 'in_progress', 'start_requested'].includes(j.status)) return false;
    const relation = getJobTimeRelation(j, yearFromContext, monthFromContext, dayFromContext);
    return relation === 'today' || relation === 'past';
  }) || [];

  const allCompletedJobs = jobs?.filter(j => j.status === 'completed') || [];

  return {
    jobs,
    language,
    activeCalendarFilter,
    setActiveCalendarFilter,
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
    setActiveTooltipDay,
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
  };
}
