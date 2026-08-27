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

export const getJobDates = (job: Job): Date[] => {
  let dateStr = job.workDate || job.periodText || '';
  
  if (!dateStr) {
    if (job.status === 'completed' || ['todo', 'in_progress', 'hired', 'start_requested'].includes(job.status) || job.status === 'applied' || job.applied) {
      if (job.appliedDate) {
        return [new Date(job.appliedDate)];
      }
      if (job.createdAt) {
        return [new Date(job.createdAt)];
      }
      return [new Date()];
    }
    return [];
  }
  
  // Clean up any weird spaces
  dateStr = dateStr.trim();

  // If it's just a single or double digit number, assume it's the day of the current month
  if (/^\d{1,2}$/.test(dateStr)) {
    const d = new Date();
    d.setDate(parseInt(dateStr, 10));
    return [d];
  }

  if (dateStr.includes(',')) {
    return dateStr.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        if (/^\d{1,2}$/.test(s)) {
          const d = new Date();
          d.setDate(parseInt(s, 10));
          return d;
        }
        return new Date(s);
      })
      .filter(d => !isNaN(d.getTime()));
  }
  
  if (dateStr.includes('~') || dateStr.includes('-')) {
    // Check if it's a date range like "10-12" or "10~12" or "2024-05-10"
    // If it's "YYYY-MM-DD", let Date constructor handle it.
    // If it's "10-12", it's a range of days in the current month.
    const isRange = (dateStr.includes('~')) || (/^\d{1,2}\s*-\s*\d{1,2}$/.test(dateStr));
    
    if (isRange) {
      const parts = dateStr.includes('~') ? dateStr.split('~') : dateStr.split('-');
      const [start, end] = parts.map(s => s.trim());
      
      let startDate = new Date(start);
      if (/^\d{1,2}$/.test(start)) {
        startDate = new Date();
        startDate.setDate(parseInt(start, 10));
      }
      
      let endDate = new Date(end);
      if (/^\d{1,2}$/.test(end)) {
        endDate = new Date(startDate);
        endDate.setDate(parseInt(end, 10));
      } else if (end.length <= 2 && !isNaN(startDate.getTime())) {
        endDate = new Date(startDate);
        endDate.setDate(parseInt(end, 10));
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const dates = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
          dates.push(new Date(cur));
          cur.setDate(cur.getDate() + 1);
        }
        return dates;
      }
    }
  }
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return [d];
  }
  
  return [new Date()];
};

export const isJobInMonth = (job: Job, year: number, month: number): boolean => {
  const dates = getJobDates(job);
  return dates.some(d => d.getFullYear() === year && d.getMonth() === month);
};

export const isJobFutureDay = (job: Job, yearFromContext: number, monthFromContext: number, dayFromContext: number): boolean => {
  const dates = getJobDates(job);
  if (dates.length === 0) return false;
  
  dates.sort((a,b) => a.getTime() - b.getTime());
  const firstDay = dates[0];
  const today = new Date(yearFromContext, monthFromContext - 1, dayFromContext);
  
  firstDay.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  return firstDay > today;
};

export const isJobOnDay = (job: Job, day: number, year: number, month: number): boolean => {
  const dates = getJobDates(job);
  return dates.some(d => d.getFullYear() === year && d.getMonth() === month && d.getDate() === day);
};

export const isJobLate = (job: Job): boolean => {
  if (job.status !== 'todo' && job.status !== 'confirmed' && job.status !== 'hired') return false;
  const timeStr = job.workTime || '';
  if (!timeStr) return false;
  
  const now = new Date();
  
  if (!isJobOnDay(job, now.getDate(), now.getFullYear(), now.getMonth())) {
    return false;
  }
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return false;
  
  const startHour = parseInt(match[1], 10);
  const startMinute = parseInt(match[2], 10);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour > startHour) return true;
  if (currentHour === startHour && currentMinute > startMinute) return true;
  return false;
};

export const getJobTimeRelation = (
  job: Job, 
  yearFromContext: number, 
  monthFromContext: number, 
  dayFromContext: number
) => {
  const dates = getJobDates(job);
  if (dates.length === 0) return 'past';

  dates.sort((a,b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  const todayDate = new Date(yearFromContext, monthFromContext - 1, dayFromContext);
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
  const dates = getJobDates(job);
  if (dates.length === 0) return false;
  
  const activeJobs = allJobs.filter(j => ['confirmed', 'todo', 'completed', 'in_progress', 'hired', 'start_requested'].includes(j.status));
  for (const d of dates) {
    if (activeJobs.some(aj => isJobOnDay(aj, d.getDate(), d.getFullYear(), d.getMonth()))) {
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
    // Past days
    if (jobsOnDay.some(j => j.status === 'completed')) return 'completed';
    if (jobsOnDay.some(j => ['confirmed', 'todo', 'in_progress', 'hired', 'start_requested'].includes(j.status))) return 'missed';
    if (jobsOnDay.some(j => j.status === 'applied' || j.applied)) return 'applied';
  }
  
  return null;
};
