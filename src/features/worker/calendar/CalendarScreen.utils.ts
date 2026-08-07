import { Job } from '../../../types';

export const MONTHS_TRANSLATIONS = {
  uz: [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ],
  ru: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

export const WEEKDAYS_TRANSLATIONS = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
};

const getJobDateStr = (job: Job): string => {
  return job.periodText || job.workDate || '2026-08-05';
};

export const isJobInMonth = (job: Job, year: number, month: number): boolean => {
  const dateStr = getJobDateStr(job);
  const datePart = dateStr.split(' ')[0];
  const monthStr = String(month + 1).padStart(2, '0');
  const prefix = `${year}-${monthStr}-`;
  return datePart.startsWith(prefix);
};

export const isJobFutureDay = (job: Job, yearFromContext: number, monthFromContext: number, dayFromContext: number): boolean => {
  const dateStr = getJobDateStr(job).split(' ')[0];
  const dayStr = dateStr.includes('~') ? dateStr.split('~')[0].split('-')[2] : dateStr.split('-')[2];
  const jobDay = parseInt(dayStr) || dayFromContext;
  
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]) || yearFromContext;
  const month = parseInt(parts[1]) || monthFromContext;
  
  if (year > yearFromContext) return true;
  if (year < yearFromContext) return false;
  if (month > monthFromContext) return true;
  if (month < monthFromContext) return false;
  return jobDay > dayFromContext;
};

export const isJobOnDay = (job: Job, day: number, year: number, month: number): boolean => {
  const dateStr = getJobDateStr(job);
  const datePart = dateStr.split(' ')[0];
  const jobYear = parseInt(datePart.split('-')[0], 10);
  const jobMonth = parseInt(datePart.split('-')[1], 10);
  
  if (jobYear !== year || jobMonth - 1 !== month) return false;

  if (datePart.includes('~')) {
    const [start, end] = datePart.split('~');
    const startDay = parseInt(start.split('-')[2], 10);
    const endDay = parseInt(end, 10);
    return day >= startDay && day <= endDay;
  } else {
    const jobDay = parseInt(datePart.split('-')[2], 10);
    return jobDay === day;
  }
};

export const getJobTimeRelation = (
  job: Job, 
  yearFromContext: number, 
  monthFromContext: number, 
  dayFromContext: number
) => {
  const dateStr = getJobDateStr(job);
  const datePart = dateStr.split(' ')[0];
  const year = parseInt(datePart.split('-')[0], 10);
  const month = parseInt(datePart.split('-')[1], 10);
  
  let startDay = parseInt(datePart.split('-')[2], 10);
  let endDay = startDay;
  if (datePart.includes('~')) {
    startDay = parseInt(datePart.split('~')[0].split('-')[2], 10);
    endDay = parseInt(datePart.split('~')[1], 10);
  }

  const todayDate = new Date(yearFromContext, monthFromContext - 1, dayFromContext);
  const startDate = new Date(year, month - 1, startDay);
  const endDate = new Date(year, month - 1, endDay);
  
  todayDate.setHours(0,0,0,0);
  startDate.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);
  
  if (todayDate >= startDate && todayDate <= endDate) {
    return 'today';
  } else if (todayDate < startDate) {
    return 'future';
  } else {
    return 'past';
  }
};

export const isOverlappingWithActiveJob = (job: Job, allJobs: Job[], yearFromContext: number, monthFromContext: number, dayFromContext: number) => {
  const dateStr = getJobDateStr(job);
  const datePart = dateStr.split(' ')[0];
  const jobYear = parseInt(datePart.split('-')[0], 10);
  const jobMonth = parseInt(datePart.split('-')[1], 10) - 1; // 0-indexed
  let startDay = parseInt(datePart.split('-')[2], 10);
  let endDay = startDay;
  if (datePart.includes('~')) {
    startDay = parseInt(datePart.split('~')[0].split('-')[2], 10);
    endDay = parseInt(datePart.split('~')[1], 10);
  }

  const activeJobs = allJobs.filter(j => ['confirmed', 'todo', 'completed', 'in_progress', 'hired', 'start_requested'].includes(j.status));
  for (let d = startDay; d <= endDay; d++) {
    if (activeJobs.some(aj => isJobOnDay(aj, d, jobYear, jobMonth))) {
      return true;
    }
  }
  return false;
};

export const getDayStatusForList = (
  day: number,
  jobs: Job[],
  currentYear: number,
  currentMonth: number,
  yearFromContext: number,
  monthFromContext: number,
  dayFromContext: number
): 'applied' | 'confirmed' | 'todo' | 'completed' | 'missed' | null => {
  const jobsOnDay = (jobs || []).filter(j => isJobOnDay(j, day, currentYear, currentMonth) && (j.status !== 'none' || j.applied));
  
  const isToday = currentYear === yearFromContext && (currentMonth + 1) === monthFromContext && day === dayFromContext;
  const isFuture = (currentYear > yearFromContext) || 
                   (currentYear === yearFromContext && (currentMonth + 1) > monthFromContext) || 
                   (currentYear === yearFromContext && (currentMonth + 1) === monthFromContext && day > dayFromContext);
  
  if (isToday) {
    if (jobsOnDay.some(j => ['confirmed', 'todo', 'in_progress', 'hired', 'start_requested'].includes(j.status))) return 'todo';
    if (jobsOnDay.some(j => j.status === 'completed')) return 'completed';
    if (jobsOnDay.some(j => j.status === 'applied' || j.applied)) return 'applied';
  } else if (isFuture) {
    if (jobsOnDay.some(j => ['confirmed', 'todo', 'in_progress', 'hired', 'start_requested'].includes(j.status))) return 'confirmed';
    if (jobsOnDay.some(j => j.status === 'completed')) return 'completed';
    if (jobsOnDay.some(j => j.status === 'applied' || j.applied)) return 'applied';
  } else {
    if (jobsOnDay.some(j => ['confirmed', 'todo', 'in_progress', 'hired', 'start_requested'].includes(j.status))) return 'todo';
    if (jobsOnDay.some(j => j.status === 'completed')) return 'completed';
    if (jobsOnDay.some(j => j.status === 'applied' || j.applied)) return 'applied';
  }
  
  return null;
};
