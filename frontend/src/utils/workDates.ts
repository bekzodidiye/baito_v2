/**
 * A job's `workDate` is free text, not a date.
 *
 * The postings in production hold values like:
 *
 *   "2026-09-06"
 *   "2026-09-02, 2026-09-03, 2026-09-04"
 *
 * so anything that treats the field as a single date sees only the first day —
 * which is how a three-day shift ended up listed under one date in the admin
 * panel and missing from the other two.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseOne = (token: string): Date | null => {
  const s = token.trim();
  if (!s) return null;
  // A bare day number means that day of the current month.
  if (/^\d{1,2}$/.test(s)) {
    const d = new Date();
    d.setDate(parseInt(s, 10));
    return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** Every day a job is worked, as `YYYY-MM-DD`, in the order written.
 * @example parseWorkDates("2026-09-02, 2026-09-03") => ["2026-09-02", "2026-09-03"]
 */
export const parseWorkDates = (workDate?: string | null): string[] => {
  const raw = (workDate || '').trim();
  if (!raw) return [];

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map(parseOne)
      .filter((d): d is Date => d !== null)
      .map(toIsoDate);
  }

  // "10~12" and "10-12" are ranges; "2026-09-02" is a single date that also
  // contains hyphens, so a range needs both sides to be day numbers.
  const isRange = raw.includes('~') || /^\d{1,2}\s*-\s*\d{1,2}$/.test(raw);
  if (isRange) {
    const [a, b] = (raw.includes('~') ? raw.split('~') : raw.split('-')).map(s => s.trim());
    const start = parseOne(a);
    if (!start) return [];
    let end = parseOne(b);
    if (b && /^\d{1,2}$/.test(b)) {
      end = new Date(start);
      end.setDate(parseInt(b, 10));
    }
    if (!end || end < start) return [toIsoDate(start)];

    const out: string[] = [];
    for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      out.push(toIsoDate(cur));
    }
    return out;
  }

  const single = parseOne(raw);
  return single ? [toIsoDate(single)] : [];
};

/** What a card shows for a shift, which may run over several days.
 *
 *  A posting's `workDate` holds every day it is worked, comma-separated. Put
 *  straight on a card it wrapped onto three and four lines, pushing the icon
 *  beside it into the middle of the block and leaving cards of wildly different
 *  heights in the same row.
 *
 *  The days are not always contiguous — "14, 15, 17, 18" skips a day — so this
 *  gives the first day and a count rather than a range, which would claim a day
 *  nobody is working. The whole list goes in `full`, for the tooltip.
 */
export const workDateSummary = (
  workDate: string | null | undefined,
  language: 'uz' | 'ru' | 'en',
): { label: string; full: string } | null => {
  const days = parseWorkDates(workDate);
  if (days.length === 0) return null;

  const full = days.join(', ');
  if (days.length === 1) return { label: days[0], full };

  const count =
    language === 'uz' ? `${days.length} kun`
    : language === 'ru' ? `${days.length} дн.`
    : `${days.length} days`;

  return { label: `${days[0]} · ${count}`, full };
};
