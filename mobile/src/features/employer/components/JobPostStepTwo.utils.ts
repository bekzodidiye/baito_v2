export const formatDateDisplay = (rawDates: string): string => {
  if (!rawDates) return '2026-08-05';
  const dates = rawDates.split(', ').filter(Boolean).sort();
  if (dates.length === 0) return '2026-08-05';

  const monthShorts = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

  if (dates.length === 1) {
    const parts = dates[0].split('-');
    if (parts.length < 3) return dates[0];
    return `${parts[2]}-${monthShorts[parseInt(parts[1], 10) - 1]}, ${parts[0]}`;
  }

  const parsed = dates.map(dStr => {
    const p = dStr.split('-');
    return { y: p[0], m: parseInt(p[1], 10), d: p[2] };
  });

  const first = parsed[0];
  const sameMonthYear = parsed.every(p => p.m === first.m && p.y === first.y);

  if (sameMonthYear) {
    const days = parsed.map(p => parseInt(p.d, 10));
    const isConsecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    if (isConsecutive) {
      return `${first.d} - ${parsed[parsed.length - 1].d} ${monthShorts[first.m - 1]}, ${first.y}`;
    }
    return `${parsed.map(p => p.d).join(', ')} ${monthShorts[first.m - 1]}, ${first.y}`;
  }

  return `${first.d} ${monthShorts[first.m - 1]} - ${parsed[parsed.length - 1].d} ${monthShorts[parsed[parsed.length - 1].m - 1]}, ${first.y}`;
};
