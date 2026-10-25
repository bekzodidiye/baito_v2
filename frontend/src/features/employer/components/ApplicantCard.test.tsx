import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ApplicantCard } from './ApplicantCard';

afterEach(cleanup);

const applicant = {
  id: 'app-1',
  jobId: 'job-1',
  jobTitle: 'Ombor yuk tashuvchi',
  workerName: 'Aziz Karimov',
  wageAmount: 400000,
  status: 'applied',
  appliedDate: '2026-09-01T09:00:00Z',
};

const renderCard = (app: Record<string, unknown> = applicant) => {
  const updateApplicationStatus = vi.fn();
  render(
    <ApplicantCard
      app={app}
      language="uz"
      updateApplicationStatus={updateApplicationStatus}
      onChatClick={vi.fn()}
    />,
  );
  return { updateApplicationStatus };
};

const pressApprove = () =>
  fireEvent.click(screen.getByRole('button', { name: /Qabul qilish/i }));

describe('ApplicantCard — hiring asks before it freezes money', () => {
  it('does not hire on the first press', () => {
    const { updateApplicationStatus } = renderCard();
    pressApprove();
    expect(updateApplicationStatus).not.toHaveBeenCalled();
  });

  it('names the worker and the exact sum about to be frozen', () => {
    renderCard();
    pressApprove();
    // uz-UZ groups with a non-breaking space; normalise so the assertion
    // reads as the sentence an employer actually sees.
    const shown = screen.getByRole('dialog').textContent?.replace(/\u00a0/g, ' ') ?? '';
    expect(shown).toContain('Aziz Karimov');
    expect(shown).toContain('400 000');
    expect(shown).toContain('Ombor yuk tashuvchi');
  });

  it('cancelling freezes nothing', () => {
    const { updateApplicationStatus } = renderCard();
    pressApprove();
    fireEvent.click(screen.getByRole('button', { name: /Bekor qilish/i }));
    expect(updateApplicationStatus).not.toHaveBeenCalled();
  });

  it('hires once confirmed', () => {
    const { updateApplicationStatus } = renderCard();
    pressApprove();
    fireEvent.click(screen.getByRole('button', { name: /^Yollash$/i }));
    expect(updateApplicationStatus).toHaveBeenCalledWith('app-1', 'hired');
  });

  it('breaks the total into the wage and the commission on top of it', () => {
    // The worker is paid the posted wage in full; the commission is the
    // employer's, charged on top. Showing only the wage would understate what
    // actually leaves their balance.
    renderCard({ ...applicant, feeAmount: 40000 });
    pressApprove();
    const shown = screen.getByRole('dialog').textContent?.replace(/\u00a0/g, ' ') ?? '';
    expect(shown).toContain('400 000');   // ish haqi
    expect(shown).toContain('40 000');    // xizmat haqi
    expect(shown).toContain('440 000');   // jami
  });

  it('says so plainly when the listing names no figure', () => {
    renderCard({ ...applicant, wageAmount: 0 });
    pressApprove();
    expect(screen.getByRole('dialog').textContent).toMatch(/kelishilgan holda/i);
  });

  it('still rejects on a single press — nothing is frozen by rejecting', () => {
    const { updateApplicationStatus } = renderCard();
    const buttons = screen.getAllByRole('button');
    const reject = buttons[buttons.length - 1];
    fireEvent.click(reject);
    expect(updateApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected');
  });
});
