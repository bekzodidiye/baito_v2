import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const confirmStartJobApi = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock('../../../api/queries', () => ({ confirmStartJobApi }));
vi.mock('../../../utils/toast', () => ({ showToast }));

import { ApplicantCard } from './ApplicantCard';

afterEach(cleanup);
beforeEach(() => { confirmStartJobApi.mockReset(); showToast.mockReset(); });

const applicant = (over: Record<string, unknown> = {}) => ({
  id: 'app-1',
  jobId: 'job-1',
  jobTitle: 'Ombor yordamchisi',
  jobStatus: 'confirmed',
  workerName: 'Aziz Karimov',
  wageAmount: 250000,
  status: 'start_requested',
  ...over,
});

const renderCard = (over: Record<string, unknown> = {}) => {
  const updateApplicationStatus = vi.fn();
  render(
    <ApplicantCard
      app={applicant(over)}
      language="uz"
      updateApplicationStatus={updateApplicationStatus}
      onChatClick={vi.fn()}
    />,
  );
  return { updateApplicationStatus };
};

const startButton = () => screen.getByRole('button', { name: /Ishni boshlash/i });

/** This button fired the request on the first tap, had no in-flight state, and
 *  no catch — so a refusal from the server reached nobody and the button sat
 *  there inviting another press. Production logged the same 400 fifteen times. */
describe('ApplicantCard — starting a shift asks first and reports back', () => {
  it('does not call the API on the first press', () => {
    renderCard();
    fireEvent.click(startButton());
    expect(confirmStartJobApi).not.toHaveBeenCalled();
  });

  it('names the worker in the question', () => {
    renderCard();
    fireEvent.click(startButton());
    expect(screen.getByRole('dialog').textContent).toContain('Aziz Karimov');
  });

  it('cancelling starts nothing', () => {
    renderCard();
    fireEvent.click(startButton());
    fireEvent.click(screen.getByRole('button', { name: /Bekor qilish/i }));
    expect(confirmStartJobApi).not.toHaveBeenCalled();
  });

  it('starts the work once confirmed', async () => {
    confirmStartJobApi.mockResolvedValue({ success: true });
    renderCard();
    fireEvent.click(startButton());
    fireEvent.click(screen.getByRole('button', { name: /^Tasdiqlash$/i }));
    await waitFor(() => expect(confirmStartJobApi).toHaveBeenCalledWith('job-1'));
  });

  it('shows what the server said when it refuses, instead of swallowing it', async () => {
    // The exact refusal production returned, fifteen times, to nobody.
    confirmStartJobApi.mockRejectedValue(new Error('Bu ish allaqachon yakunlangan'));
    renderCard();
    fireEvent.click(startButton());
    fireEvent.click(screen.getByRole('button', { name: /^Tasdiqlash$/i }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Bu ish allaqachon yakunlangan', 'error'),
    );
  });

  it('is not offered at all once the shift has finished', () => {
    renderCard({ jobStatus: 'completed' });
    expect(screen.queryByRole('button', { name: /Ishni boshlash/i })).toBeNull();
  });

  it('is not offered on a cancelled shift either', () => {
    renderCard({ jobStatus: 'cancelled' });
    expect(screen.queryByRole('button', { name: /Ishni boshlash/i })).toBeNull();
  });
});
