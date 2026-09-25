/** What actually happened against the shift that was advertised.
 *
 * `workTime` is the posting's own text — "09:00 - 18:00". On its own it says
 * nothing about whether anyone turned up at nine, which is the thing an
 * administrator opens this screen to find out.
 */

export interface WorkTiming {
  /** "09:12", or null when nothing was recorded. */
  startedAt: string | null;
  finishedAt: string | null;
  /** Minutes late starting. Negative means early; null when unknowable. */
  startDelayMin: number | null;
  /** Minutes past the advertised finish. Negative means they left early. */
  finishDelayMin: number | null;
  /** How long the shift actually ran, in minutes. */
  workedMin: number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local wall-clock time of an ISO timestamp, to the minute. */
export const clockOf = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Minutes since midnight for "HH:MM". */
const minutesOf = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** The two ends of "09:00 - 18:00". Either may be missing. */
export const scheduledWindow = (workTime?: string | null) => {
  if (!workTime) return { start: null as number | null, end: null as number | null };
  const parts = workTime.split('-');
  const start = parts[0] ? minutesOf(parts[0]) : null;
  const end = parts[1] ? minutesOf(parts[1]) : null;
  return { start, end };
};

export const workTimingOf = (job: {
  workTime?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}): WorkTiming => {
  const startedAt = clockOf(job.startedAt);
  const finishedAt = clockOf(job.completedAt);
  const { start, end } = scheduledWindow(job.workTime);

  const startedMin = startedAt ? minutesOf(startedAt) : null;
  const finishedMin = finishedAt ? minutesOf(finishedAt) : null;

  // A shift that runs past midnight finishes at a smaller number than it
  // started. Treating that literally reports a worker who left twenty-two
  // hours early, so the day is rolled over instead.
  let workedMin: number | null = null;
  if (startedMin !== null && finishedMin !== null) {
    workedMin = finishedMin - startedMin;
    if (workedMin < 0) workedMin += 24 * 60;
  }

  return {
    startedAt,
    finishedAt,
    startDelayMin: startedMin !== null && start !== null ? startedMin - start : null,
    finishDelayMin: finishedMin !== null && end !== null ? finishedMin - end : null,
    workedMin,
  };
};

/** "1 soat 20 daqiqa", "45 daqiqa". Always a positive reading — the caller
 *  decides whether it is late or early. */
export const humanMinutes = (minutes: number): string => {
  const total = Math.abs(Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} daqiqa`;
  if (m === 0) return `${h} soat`;
  return `${h} soat ${m} daqiqa`;
};

/** Below this a start is not worth calling out: clocking in at 09:03 is on
 *  time by any standard a human would apply. */
export const LATE_THRESHOLD_MIN = 10;
