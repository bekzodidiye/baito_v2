import { describe, it, expect } from 'vitest';
import { workTimingOf, humanMinutes, scheduledWindow, clockOf } from './workTiming';

/** The admin screen showed "09:00 - 18:00" — the shift that was advertised —
 *  and nothing about whether anyone turned up at nine. These read the gap. */

// Built in local time on purpose: the screen shows wall-clock times to a person
// sitting in the same timezone as the shift.
const at = (h: number, m: number) => new Date(2026, 8, 2, h, m).toISOString();

describe('workTimingOf — what happened against what was promised', () => {
  it('reads the real clock times off the timestamps', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: at(9, 0), completedAt: at(18, 0) });
    expect(t.startedAt).toBe('09:00');
    expect(t.finishedAt).toBe('18:00');
    expect(t.workedMin).toBe(540);
  });

  it('measures a late start against the advertised one', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: at(11, 20), completedAt: null });
    expect(t.startDelayMin).toBe(140);
    expect(humanMinutes(t.startDelayMin as number)).toBe('2 soat 20 daqiqa');
  });

  it('reports an early start as a negative delay, not as lateness', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: at(8, 30), completedAt: null });
    expect(t.startDelayMin).toBe(-30);
  });

  it('measures running over at the other end', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: at(9, 0), completedAt: at(19, 45) });
    expect(t.finishDelayMin).toBe(105);
    expect(t.workedMin).toBe(645);
  });

  it('counts a shift that crosses midnight as one evening, not minus 22 hours', () => {
    // 22:00 to 02:00. Subtracting the clock readings literally would report
    // somebody who left twenty hours early.
    const t = workTimingOf({
      workTime: '22:00 - 02:00',
      startedAt: new Date(2026, 8, 2, 22, 0).toISOString(),
      completedAt: new Date(2026, 8, 3, 2, 0).toISOString(),
    });
    expect(t.workedMin).toBe(240);
  });

  it('says nothing rather than guessing when no time was recorded', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: null, completedAt: null });
    expect(t.startedAt).toBeNull();
    expect(t.finishedAt).toBeNull();
    expect(t.startDelayMin).toBeNull();
    expect(t.workedMin).toBeNull();
  });

  it('still shows the start when the job has not finished yet', () => {
    const t = workTimingOf({ workTime: '09:00 - 18:00', startedAt: at(9, 5), completedAt: null });
    expect(t.startedAt).toBe('09:05');
    expect(t.finishedAt).toBeNull();
    expect(t.finishDelayMin).toBeNull();
    expect(t.workedMin).toBeNull();
  });

  it('cannot measure lateness when the posting named no hours', () => {
    const t = workTimingOf({ workTime: null, startedAt: at(9, 0), completedAt: at(18, 0) });
    expect(t.startDelayMin).toBeNull();
    expect(t.finishDelayMin).toBeNull();
    // The times themselves are still real, and still worth showing.
    expect(t.startedAt).toBe('09:00');
    expect(t.workedMin).toBe(540);
  });
});

describe('the small pieces', () => {
  it('parses both ends of the advertised window', () => {
    expect(scheduledWindow('09:00 - 18:00')).toEqual({ start: 540, end: 1080 });
  });

  it('refuses a window that is not a time', () => {
    expect(scheduledWindow('kelishilgan holda')).toEqual({ start: null, end: null });
    expect(scheduledWindow('25:00 - 18:00')).toEqual({ start: null, end: 1080 });
  });

  it('refuses a timestamp that is not one', () => {
    expect(clockOf('nonsense')).toBeNull();
    expect(clockOf(null)).toBeNull();
  });

  it('reads durations the way a person would say them', () => {
    expect(humanMinutes(45)).toBe('45 daqiqa');
    expect(humanMinutes(60)).toBe('1 soat');
    expect(humanMinutes(140)).toBe('2 soat 20 daqiqa');
    expect(humanMinutes(-140)).toBe('2 soat 20 daqiqa');
  });
});
