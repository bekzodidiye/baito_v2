import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AdminDailyJobs } from './AdminDailyJobs';
import { AdminJob, AdminUser } from './types';

vi.mock('../../api/client', () => ({ apiClient: vi.fn() }));

afterEach(cleanup);

const mockUser: AdminUser = {
  id: 'w1',
  name: 'Test Ishchi',
  phone: '+998901234567',
  role: 'worker',
  isVerified: true,
};

const baseJob: AdminJob = {
  id: 'j1',
  title: 'Omborda yuk tashish',
  company: 'Mega Logistics MCHJ',
  employerId: 'emp1',
  salary: '250000',
  location: 'Toshkent, Sergeli',
  description: 'Yuk tushirish va taxlash',
  status: 'open',
  workDate: '2026-10-04',
  workTime: '09:00 - 18:00',
  category: 'Logistika',
  vacancies: 2,
  hiredCount: 0,
};

describe('AdminDailyJobs — Modern UI & Layout', () => {
  it('renders open job with unassigned worker button and quota', () => {
    render(
      <AdminDailyJobs
        jobs={[baseJob]}
        users={[mockUser]}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    expect(screen.getByText('Omborda yuk tashish')).toBeTruthy();
    expect(screen.getByText('Logistika')).toBeTruthy();
    expect(screen.getByText(/Kvota: 0\/2/)).toBeTruthy();
    expect(screen.getByText(/Ishchi biriktirish/i)).toBeTruthy();
    expect(screen.queryByText('Haqiqiy vaqt qayd etilmagan')).toBeNull();
  });

  it('renders assigned worker card chip instead of raw select box', () => {
    const assignedJob: AdminJob = {
      ...baseJob,
      status: 'confirmed',
      workerId: 'w1',
      hiredCount: 1,
    };

    render(
      <AdminDailyJobs
        jobs={[assignedJob]}
        users={[mockUser]}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    // Shows worker name, phone, and view button
    expect(screen.getByText('Test Ishchi')).toBeTruthy();
    expect(screen.getByText('+998901234567')).toBeTruthy();
    expect(screen.getByLabelText("Ishchi profilini ko'rish")).toBeTruthy();
    expect(screen.getByLabelText('Ishchini almashtirish')).toBeTruthy();
  });

  it('renders completed job with prominent payout button and clean shift completion badge', () => {
    const completedJob: AdminJob = {
      ...baseJob,
      status: 'completed',
      workerId: 'w1',
      hiredCount: 1,
    };

    render(
      <AdminDailyJobs
        jobs={[completedJob]}
        users={[mockUser]}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    expect(screen.getByText("To'lov qilish")).toBeTruthy();
    expect(screen.getByText('Smena yakunlangan')).toBeTruthy();
    expect(screen.queryByText('Haqiqiy vaqt qayd etilmagan')).toBeNull();
  });

  it('opens worker assign dropdown when clicking assign button', () => {
    render(
      <AdminDailyJobs
        jobs={[baseJob]}
        users={[mockUser]}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    const assignBtn = screen.getByText(/Ishchi biriktirish/i);
    fireEvent.click(assignBtn);

    expect(screen.getByPlaceholderText('Ishchini qidirish...')).toBeTruthy();
    expect(screen.getByText('Test Ishchi')).toBeTruthy();
  });
});
