import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AdminJobs } from './AdminJobs';
import { AdminJob } from './types';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn().mockImplementation(() => Promise.resolve({})),
}));

vi.mock('./JobDetailModal', () => ({
  JobDetailModal: ({ job, onClose }: any) => job ? (
    <div data-testid="job-detail-modal">
      <span>Modal: {job.title}</span>
      <button onClick={onClose}>Yopish</button>
    </div>
  ) : null,
}));

afterEach(cleanup);

const mockJobs: AdminJob[] = [
  {
    id: 'job-12345678',
    title: 'Senior Frontend Developer',
    company: 'Korzinka.uz',
    employerId: 'emp1',
    salary: '3333333',
    location: 'Samarqand viloyati, Samarqand sh.',
    rawLocation: 'Samarqand viloyati, Samarqand sh.',
    description: 'React va TypeScript bo‘yicha tajribali mutaxassis',
    status: 'pending',
    workDate: '2026-10-06, 2026-10-07, 2026-10-08',
    workTime: '09:00 - 18:00',
    category: 'IT va Dasturlash',
    vacancies: 3,
    hiredCount: 1,
    urgent: true,
  },
  {
    id: 'job-87654321',
    title: 'Omborxona Ishchisi',
    company: 'Balto Logistics',
    employerId: 'emp2',
    salary: '250000',
    location: 'Toshkent sh., Chilonzor',
    description: 'Yuk ortish va tushirish',
    status: 'open',
    workDate: '2026-10-06',
    workTime: '08:00 - 17:00',
    category: 'Ombor',
    vacancies: 2,
    hiredCount: 2,
  },
];

describe('AdminJobs — Redesigned Modern Grid & Card System', () => {
  it('renders grid cards with brand avatar initials and job details', () => {
    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    expect(screen.getByText('Senior Frontend Developer')).toBeTruthy();
    expect(screen.getByText('Korzinka.uz')).toBeTruthy();
    expect(screen.getByText('K')).toBeTruthy(); // Initial from Korzinka.uz
    expect(screen.getAllByText('Moderatsiyada').length).toBeGreaterThanOrEqual(1);

    // Badges (Category, Zudlik) and Batafsil button are removed for ultra-clean minimalism
    expect(screen.queryByText('IT va Dasturlash')).toBeNull();
    expect(screen.queryByText('Zudlik')).toBeNull();
    expect(screen.queryByText('Batafsil')).toBeNull();
  });

  it('renders minimal grid card without salary box, and shows salary in table view', () => {
    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    // In minimal grid view, salary is omitted so user inspects details via modal
    expect(screen.queryByText(/3[\s,.]*333[\s,.]*333/)).toBeNull();

    // Switch to table view
    const tableButton = screen.getByTitle("Jadval ko'rinishi");
    fireEvent.click(tableButton);

    // In table view, salary is present
    expect(screen.getByText(/3[\s,.]*333[\s,.]*333/)).toBeTruthy();
    expect(screen.getByText(/250[\s,.]*000/)).toBeTruthy();
  });

  it('renders moderation actions (Rad etish / Tasdiqlash) for pending jobs', () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();

    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
        onApproveJob={handleApprove}
        onRejectJob={handleReject}
      />
    );

    const approveBtn = screen.getByText('Tasdiqlash');
    expect(approveBtn).toBeTruthy();
    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledWith('job-12345678');
  });

  it('opens job detail modal when card is clicked to see full details', () => {
    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    const card = screen.getByLabelText('Senior Frontend Developer — batafsil');
    fireEvent.click(card);

    // Modal opens showing full details
    expect(screen.getByText('Modal: Senior Frontend Developer')).toBeTruthy();
  });

  it('allows copying job ID with visual feedback', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    const copyBtn = screen.getAllByTitle('ID nusxalash')[0];
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith('job-12345678');
  });

  it('allows changing job status via StatusSelect without clipping or card click', () => {
    const handleStatusChange = vi.fn();

    render(
      <AdminJobs
        jobs={mockJobs}
        onChangeJobStatus={handleStatusChange}
        onDeleteJob={vi.fn()}
      />
    );

    // mockJobs[1] has status 'open' -> status button displays 'Ariza ochiq'
    const openStatusBtn = screen.getAllByText('Ariza ochiq')[0];
    fireEvent.click(openStatusBtn);

    // Dropdown portaled to document.body displays options cleanly
    const hiredOption = screen.getByText('Ishchi olindi');
    expect(hiredOption).toBeTruthy();
    fireEvent.click(hiredOption);

    expect(handleStatusChange).toHaveBeenCalledWith('job-87654321', 'confirmed');
  });
});
