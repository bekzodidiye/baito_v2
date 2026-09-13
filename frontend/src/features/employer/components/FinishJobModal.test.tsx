import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const THREE_DAYS = [
  { id: 'd1', workDate: '2026-09-02', status: 'pending', amount: 250000 },
  { id: 'd2', workDate: '2026-09-03', status: 'pending', amount: 250000 },
  { id: 'd3', workDate: '2026-09-04', status: 'pending', amount: 250000 },
];

let days: unknown[] = [];
const completeDay = vi.fn();

vi.mock('../../../api/queries', () => ({
  fetchJobDaysApi: () => Promise.resolve(days),
  completeJobDayApi: (...args: unknown[]) => completeDay(...args),
}));

import { FinishJobModal } from './FinishJobModal';

afterEach(() => { cleanup(); days = []; completeDay.mockReset(); });

const renderModal = (over: Record<string, unknown> = {}) => {
  const onConfirm = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FinishJobModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        jobTitle="Ombor yuk tashuvchi"
        language="uz"
        {...over}
      />
    </QueryClientProvider>,
  );
  return { onConfirm };
};

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /Yakunlash va Tasdiqlash/i }));

describe('FinishJobModal — completing a job is a deliberate step', () => {
  it('completes nothing just by opening', () => {
    const { onConfirm } = renderModal();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('passes the rating, review and bonus on submit', () => {
    const { onConfirm } = renderModal();
    const [review, bonus] = screen.getAllByRole('textbox');
    fireEvent.change(review, { target: { value: "A'lo ishchi" } });
    fireEvent.change(bonus, { target: { value: '25000' } });
    submit();
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ review: "A'lo ishchi", bonus: 25000 }),
    );
  });

  it('reads a bonus typed with spaces as one number', () => {
    // The bonus is now a real debit against the employer, so "25 000" must
    // not arrive as 25.
    const { onConfirm } = renderModal();
    const [, bonus] = screen.getAllByRole('textbox');
    fireEvent.change(bonus, { target: { value: '25 000' } });
    submit();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bonus: 25000 }));
  });

  it('sends no bonus when the field is left empty', () => {
    const { onConfirm } = renderModal();
    submit();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bonus: 0 }));
  });
});

describe('FinishJobModal — a multi-day shift is finished a day at a time', () => {
  it('lists every day of the posting', async () => {
    days = THREE_DAYS;
    renderModal({ jobId: 'job-1' });

    expect(await screen.findByText('2026-09-02')).toBeTruthy();
    expect(screen.getByText('2026-09-03')).toBeTruthy();
    expect(screen.getByText('2026-09-04')).toBeTruthy();
    expect(screen.getByText(/3\/3/)).toBeTruthy();
  });

  it('finishes one day without touching the others', async () => {
    days = THREE_DAYS;
    completeDay.mockResolvedValue({ success: true });
    renderModal({ jobId: 'job-1' });

    const buttons = await screen.findAllByRole('button', { name: /^Yakunlash$/i });
    // Three days, three separate buttons. The defect this replaces was one
    // press ending — and paying for — all three at once.
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(completeDay).toHaveBeenCalledWith('job-1', 'd1'));
    expect(completeDay).toHaveBeenCalledTimes(1);
  });

  it('shows a finished day as paid, with no way to pay it again', async () => {
    days = [{ ...THREE_DAYS[0], status: 'completed' }, THREE_DAYS[1], THREE_DAYS[2]];
    renderModal({ jobId: 'job-1' });

    expect(await screen.findByText(/to'landi/i)).toBeTruthy();
    expect(screen.getByText(/2\/3/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Yakunlash$/i })).toHaveLength(2);
  });

  it('offers no day chooser for a single-day job', async () => {
    days = [THREE_DAYS[0]];
    renderModal({ jobId: 'job-1' });

    // The choice only means something when there is more than one day.
    await waitFor(() => expect(screen.queryByText('2026-09-02')).toBeNull());
    expect(screen.getByRole('button', { name: /Yakunlash va Tasdiqlash/i })).toBeTruthy();
  });

  it('surfaces a refusal from the server instead of silently doing nothing', async () => {
    days = THREE_DAYS;
    completeDay.mockRejectedValue(new Error('Bu kun allaqachon yakunlangan'));
    renderModal({ jobId: 'job-1' });

    fireEvent.click((await screen.findAllByRole('button', { name: /^Yakunlash$/i }))[0]);

    expect(await screen.findByText(/allaqachon yakunlangan/i)).toBeTruthy();
  });
});
