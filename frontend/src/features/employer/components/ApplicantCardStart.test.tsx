import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ApplicantCard } from './ApplicantCard';

afterEach(cleanup);

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

describe('ApplicantCard — employer never starts or completes work (worker-only actions)', () => {
  it('is not offered a start button when worker requested start', () => {
    renderCard({ status: 'start_requested' });
    expect(screen.queryByRole('button', { name: /Ishni boshlash/i })).toBeNull();
  });

  it('is not offered a finish button when in progress', () => {
    renderCard({ status: 'in_progress', jobStatus: 'in_progress' });
    expect(screen.queryByRole('button', { name: /Ishni yakunlash/i })).toBeNull();
  });

  it('is not offered a start button once the shift has finished', () => {
    renderCard({ jobStatus: 'completed' });
    expect(screen.queryByRole('button', { name: /Ishni boshlash/i })).toBeNull();
  });

  it('is not offered a start button on a cancelled shift either', () => {
    renderCard({ jobStatus: 'cancelled' });
    expect(screen.queryByRole('button', { name: /Ishni boshlash/i })).toBeNull();
  });

  it('offers hire and reject buttons only when status is applied', () => {
    renderCard({ status: 'applied', jobStatus: 'open' });
    expect(screen.getByRole('button', { name: /Qabul qilish/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /Rad etish/i })).not.toBeNull();
  });
});
