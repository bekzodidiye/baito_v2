import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ language: 'uz' }) }));
vi.mock('../../api/queries', () => ({ requestStartJobApi: vi.fn() }));

import { JobDetailsFooter } from './JobDetailsFooter';
import { Job } from '../../types';

afterEach(cleanup);

const job = {
  id: 'job-1',
  title: 'Ombor yuk tashuvchi',
  salary: "400 000 so'm",
  workDate: '2026-09-10',
  workTime: '09:00 - 18:00',
  status: 'open',
  applied: false,
} as unknown as Job;

const renderFooter = () => {
  const applyToJob = vi.fn().mockResolvedValue(true);
  render(<JobDetailsFooter selectedJob={job} applyToJob={applyToJob} />);
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
