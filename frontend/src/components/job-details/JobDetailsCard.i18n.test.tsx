import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));

import { JobDetailsCard } from './JobDetailsCard';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const job = (over: Record<string, unknown> = {}) => ({
  id: 'job-1',
  title: 'Yuk tashuvchi',
  company: 'Sinov korxona',
  salary: '100000 UZS',
  // What the employer form actually stores: the figure with "UZS" on it.
  hourlyRate: '100000 UZS',
  transportRate: '15000 UZS',
  location: "Samarqand, Ibn Sino ko'chasi",
  workDate: '2026-09-16',
  workTime: '09:00 - 18:00',
  neededWorkers: '1',
  ...over,
}) as never;

const text = () => document.body.textContent?.replace(/ /g, ' ') ?? '';

/** Two things this card got wrong for anybody not reading Uzbek.
 *
 *  The transport figure is stored as "15000 UZS". The card looked for "so'm"
 *  or "сум", did not find either, and appended "so'm" — so the tile read
 *  "15000 UZS so'm", in Uzbek, to a Russian reader.
 *
 *  And the badge above it said "12 soat muddatgacha" in every language, while
 *  `deadlineText` sat translated and unused in all three locale files. */
describe('JobDetailsCard — the rates and the deadline read in one language', () => {
  it('does not stack two currencies on the transport figure', () => {
    render(<JobDetailsCard selectedJob={job()} />);
    expect(text()).not.toContain("UZS so'm");
    expect(text()).not.toContain('UZS сум');
  });

  it('says the currency in Russian to a Russian reader', () => {
    render(<JobDetailsCard selectedJob={job()} />);
    expect(text()).toContain('15000 сум');
  });

  it('says it in Uzbek to an Uzbek reader', () => {
    language.current = 'uz';
    render(<JobDetailsCard selectedJob={job()} />);
    expect(text()).toContain("15000 so'm");
  });

  it('leaves an already-correct Uzbek figure alone rather than doubling it', () => {
    language.current = 'uz';
    render(<JobDetailsCard selectedJob={job({ transportRate: "15 000 so'm" })} />);
    expect(text()).toContain("15 000 so'm");
    expect(text()).not.toContain("so'm so'm");
  });

  it('translates the deadline badge instead of saying muddatgacha to everyone', () => {
    render(<JobDetailsCard selectedJob={job({ durationLabel: '12 soat' })} />);
    expect(text()).not.toContain('muddatgacha');
    expect(text()).toContain('До 12 soat');
  });

  it('falls back to a translated duration when the posting names none', () => {
    render(<JobDetailsCard selectedJob={job()} />);
    expect(text()).toContain('До 12 часов');
    expect(text()).not.toContain('soat');
  });

  it('still says muddatgacha in Uzbek', () => {
    language.current = 'uz';
    render(<JobDetailsCard selectedJob={job()} />);
    expect(text()).toContain('12 soat muddatgacha');
  });
});
