import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const completeJobMock = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ language: 'uz' }) }));
vi.mock('../../api/queries', () => ({
  requestStartJobApi: vi.fn(),
  completeJobApi: (...args: unknown[]) => completeJobMock(...args),
}));

import { JobDetailsFooter } from './JobDetailsFooter';
import { Job } from '../../types';

afterEach(() => {
  cleanup();
  completeJobMock.mockClear();
});

const job = {
  id: 'job-1',
  title: 'Ombor yuk tashuvchi',
  salary: "400 000 so'm",
  workDate: '2026-09-10',
  workTime: '09:00 - 18:00',
  status: 'open',
  applied: false,
} as unknown as Job;

const renderFooter = (jobOverride = job) => {
  const applyToJob = vi.fn().mockResolvedValue(true);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <JobDetailsFooter selectedJob={jobOverride} applyToJob={applyToJob} />
    </QueryClientProvider>
  );
  return { applyToJob };
};

const pressApply = () =>
  fireEvent.click(screen.getByRole('button', { name: /ariza topshirish/i }));

describe('JobDetailsFooter — applying asks before it commits the worker', () => {
  it('does not apply on the first press', () => {
    const { applyToJob } = renderFooter();
    pressApply();
    expect(applyToJob).not.toHaveBeenCalled();
  });

  it('names the shift, when it is, and what it pays', () => {
    renderFooter();
    pressApply();
    const shown = screen.getByRole('dialog').textContent ?? '';
    expect(shown).toContain('Ombor yuk tashuvchi');
    expect(shown).toContain('2026-09-10');
    expect(shown).toContain('09:00 - 18:00');
    expect(shown).toContain("400 000 so'm");
  });

  it('cancelling applies to nothing', () => {
    const { applyToJob } = renderFooter();
    pressApply();
    fireEvent.click(screen.getByRole('button', { name: /Bekor qilish/i }));
    expect(applyToJob).not.toHaveBeenCalled();
  });

  it('applies once confirmed', async () => {
    const { applyToJob } = renderFooter();
    pressApply();
    fireEvent.click(screen.getByRole('button', { name: /^Topshirish$/i }));
    await waitFor(() => expect(applyToJob).toHaveBeenCalledWith('job-1'));
  });
});

describe('JobDetailsFooter — worker finishing an in_progress job', () => {
  it('allows worker to finish an in_progress job after confirmation', async () => {
    const inProgressJob = { ...job, status: 'in_progress' } as unknown as Job;
    renderFooter(inProgressJob);

    const finishBtn = screen.getByRole('button', { name: /Ishni yakunlash/i });
    expect(finishBtn).toBeTruthy();

    fireEvent.click(finishBtn);
    expect(completeJobMock).not.toHaveBeenCalled();

    const confirmBtn = screen.getByRole('button', { name: /^Ha, yakunladim$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(completeJobMock).toHaveBeenCalledWith('job-1'));
  });
});

