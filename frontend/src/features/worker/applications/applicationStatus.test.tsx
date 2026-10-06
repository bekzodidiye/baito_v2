/** The badge on a worker's application says where they stand.
 *
 *  It knew three statuses — applied, hired, rejected — and printed the
 *  database's own word for the rest. A worker waiting to start read
 *  `START_REQUESTED` on their own screen, in every language.
 *
 *  Being hired is not where a worker stops: they confirm, they ask to start,
 *  they work, they finish, and the application status moves with them.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ApplicationCard } from './ApplicationCard';

afterEach(cleanup);

/** Every status the backend writes to an application. */
const STATUSES = ['applied', 'hired', 'rejected', 'confirmed',
                  'start_requested', 'in_progress', 'completed'] as const;

const LANGS = ['uz', 'ru', 'en'] as const;

const application = (status: string) => ({
  id: 'a1',
  jobId: 'j1',
  jobTitle: 'Ofitsiant',
  jobCompany: 'Bosh',
  jobLocation: 'Toshkent',
  jobDate: '2026-09-20',
  status,
  appliedDate: '2026-09-20T10:00:00Z',
});

const draw = (status: string, language: (typeof LANGS)[number]) =>
  render(
    <ApplicationCard
      application={application(status) as never}
      language={language}
      onClick={vi.fn()}
    />,
  );

const body = () => document.body.textContent ?? '';

describe('the status badge', () => {
  for (const language of LANGS) {
    it.each(STATUSES)(`never shows the raw value for %s in ${language}`, (status) => {
      draw(status, language);
      // START_REQUESTED, IN_PROGRESS and the rest are database words.
      expect(body()).not.toMatch(/\b[A-Z][A-Z_]{4,}\b/);
      expect(body()).not.toContain(status);
    });
  }

  it('says something different for a worker waiting to start', () => {
    draw('start_requested', 'ru');
    const ru = body();
    cleanup();
    draw('in_progress', 'ru');
    expect(body()).not.toBe(ru);
  });

  it('answers a Russian reader in Russian', () => {
    for (const status of STATUSES) {
      draw(status, 'ru');
      expect(body(), status).toMatch(/[а-яА-ЯёЁ]/);
      cleanup();
    }
  });

  it('falls back to a neutral word for a status nobody planned for', () => {
    draw('something_new_entirely', 'ru');
    expect(body()).not.toContain('something_new_entirely');
    expect(body()).toContain('Статус');
  });
});
