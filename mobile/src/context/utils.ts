export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('localStorage is not accessible in this environment:', e);
    return null;
  }
};

export const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage is not accessible in this environment:', e);
  }
};

export const getJobDates = (periodText?: string): string[] => {
  if (!periodText) return [];
  const datePart = periodText.split(' ')[0]; // e.g. "2026-06-10" or "2026-06-10~12"
  
  if (!datePart.includes('~')) {
    return [datePart];
  }
  
  const [start, endDayStr] = datePart.split('~'); // "2026-06-10", "12"
  const startParts = start.split('-'); // ["2026", "06", "10"]
  if (startParts.length !== 3) return [datePart];
  
  const year = startParts[0];
  const month = startParts[1];
  const startDay = parseInt(startParts[2], 10);
  const endDay = parseInt(endDayStr, 10);
  
  const dates: string[] = [];
  for (let i = startDay; i <= endDay; i++) {
    const dayStr = String(i).padStart(2, '0');
    dates.push(`${year}-${month}-${dayStr}`);
  }
  return dates;
};
