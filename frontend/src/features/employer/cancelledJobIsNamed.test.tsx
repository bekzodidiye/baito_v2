/** A cancelled posting says so, and does not turn up as today's work.
 *
 *  Reported from the dashboard: two postings listed under today while
 *  "E'lonlarim" counted none open. Both were cancelled. Three separate things
 *  were wrong.
 *
 *  `Job['status']` did not include `'cancelled'`, though `DELETE /jobs/{id}`
 *  writes exactly that — so TypeScript could not warn that the card had no
 *  branch for it, and a cancelled posting fell through to the last `else`: the
 *  pill that says it is waiting for a worker.
 *
 *  And the dashboard's day strip matched `job.workDate === day`, on a field
 *  that holds every day a shift is worked, and filtered by no status at all.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { EmployerJobCard } from './EmployerJobCard';
import { parseWorkDates } from '../../utils/workDates';
import { Job } from '../../types';

afterEach(cleanup);

const job = (over: Partial<Job>) => ({
  id: 'j', title: 'erfssefes', company: 'Baito', salary: '100000 UZS',
  rawLocation: 'Samarqand', workDate: '2026-09-21', tags: [],
  coordinates: { x: 0, y: 0 }, time: '', urgent: false, applied: false,
  bookmarked: false, description: '', ...over,
}) as unknown as Job;

const show = (j: Job, language: 'uz' | 'ru' | 'en' = 'uz') =>
  render(<EmployerJobCard job={j} language={language} onSelect={() => {}}
    onComplete={() => {}} onDelete={() => {}} />);

describe('what the card calls a cancelled posting', () => {
  it('does not say it is waiting for a worker', () => {
    show(job({ status: 'cancelled' }));
    expect(screen.queryByText('Kutilyapti')).toBeNull();
  });

  it('says it was cancelled', () => {
    show(job({ status: 'cancelled' }));
    expect(screen.getByText('Bekor qilindi')).toBeTruthy();
  });

  it('says so in the reader’s language', () => {
    show(job({ status: 'cancelled' }), 'ru');
    expect(screen.getByText('Отменено')).toBeTruthy();
    cleanup();
    show(job({ status: 'cancelled' }), 'en');
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('still says the right thing about every other status', () => {
    const cases: [Job['status'], string][] = [
      ['open', 'Kutilyapti'],
      ['confirmed', 'Ishchi olindi'],
      ['in_progress', 'Yakunlash'],
      ['completed', 'Yopildi'],
    ];
    for (const [status, label] of cases) {
      cleanup();
      show(job({ status }));
      expect(screen.getByText(label), `${status} should read ${label}`).toBeTruthy();
    }
  });
});

describe('the status list the card branches on', () => {
  const backendStatuses = (): string[] => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../../backend/app/models/job.py'), 'utf8');
    const block = src.slice(src.indexOf('class JobStatus'), src.indexOf('OPEN_STATUSES'));
    return [...block.matchAll(/^\s+[A-Z_]+ = "([a-z_]+)"/gm)].map(m => m[1]);
  };

  const frontendUnion = (): string[] => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../types.ts'), 'utf8');
    const m = src.match(/^\s+status: ('[a-z_]+'(?: \| '[a-z_]+')*);/m);
    if (!m) throw new Error("Job['status'] union not found in types.ts");
    return m[1].split('|').map(s => s.trim().replace(/'/g, ''));
  };

  it('holds every status the server can write', () => {
    // This is the drift that hid the bug: the server had five, the type had
    // nine, and `cancelled` was in the server's five and none of the nine.
    const missing = backendStatuses().filter(s => !frontendUnion().includes(s));
    expect(missing, `missing from Job['status']: ${missing.join(', ')}`).toEqual([]);
  });

  it('reads a realistic number of statuses out of the server', () => {
    expect(backendStatuses().length).toBeGreaterThanOrEqual(5);
    expect(backendStatuses()).toContain('cancelled');
  });
});

describe('which postings the dashboard lists under a day', () => {
  const DAY = '2026-09-21';
  const listedOn = (jobs: Job[], day: string) =>
    jobs.filter(j => j.status !== 'cancelled' && parseWorkDates(j.workDate).includes(day));

  it('leaves a cancelled posting out', () => {
    expect(listedOn([job({ status: 'cancelled' })], DAY)).toHaveLength(0);
  });

  it('keeps an open one', () => {
    expect(listedOn([job({ status: 'open' })], DAY)).toHaveLength(1);
  });

  it('finds a shift that runs over several days on each of them', () => {
    // `workDate === day` was false for all three, so the posting appeared
    // under none of its own days.
    const multi = job({ status: 'open', workDate: '2026-09-20, 2026-09-21, 2026-09-22' });
    expect(multi.workDate === DAY).toBe(false);
    for (const d of ['2026-09-20', '2026-09-21', '2026-09-22']) {
      expect(listedOn([multi], d), d).toHaveLength(1);
    }
  });

  it('does not list it on a day it is not worked', () => {
    const multi = job({ status: 'open', workDate: '2026-09-20, 2026-09-22' });
    expect(listedOn([multi], '2026-09-21')).toHaveLength(0);
  });
});

describe('the dashboard reads the field the way the rest of the app does', () => {
  /** The file with its comments stripped — the old comparison is quoted in one. */
  const code = () =>
    fs.readFileSync(path.resolve(__dirname, 'EmployerDashboard.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it('goes through parseWorkDates rather than comparing the raw string', () => {
    expect(code()).toContain('parseWorkDates(job.workDate).includes(selectedFullDateStr)');
    expect(code()).not.toContain('job.workDate === selectedFullDateStr');
  });

  it('keeps cancelled postings out of the day list', () => {
    expect(code()).toContain("job.status !== 'cancelled'");
  });
});
