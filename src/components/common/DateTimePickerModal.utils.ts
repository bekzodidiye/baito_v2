export const MONTH_NAMES_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
export const WEEKDAYS_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

export const parseInitial24hTime = (timeValue: string): { hour: number; minute: number } => {
  if (!timeValue) return { hour: 9, minute: 0 };
  const [hStr, mStr] = timeValue.split(':');
  const h = parseInt(hStr || '9', 10);
  const m = parseInt(mStr || '0', 10);
  return {
    hour: isNaN(h) ? 9 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
  };
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfWeek = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};
