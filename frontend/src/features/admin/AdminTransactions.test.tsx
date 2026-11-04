import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AdminTransactions } from './AdminTransactions';
import { AdminTransaction } from './types';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(),
}));

afterEach(cleanup);

const mockTransactions: AdminTransaction[] = [
  {
    id: 'tx-1001',
    jobId: 'j-1',
    employerId: 'emp-1',
    employerName: 'Mega Logistics',
    workerId: 'w-1',
    workerName: 'Aziz Ishchi',
    amount: '300000',
    platformFee: '30000',
    type: 'deposit',
    status: 'paid',
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'tx-1002',
    jobId: 'j-1',
    employerId: 'emp-1',
    employerName: 'Mega Logistics',
    workerId: 'w-1',
    workerName: 'Aziz Ishchi',
    amount: '270000',
    platformFee: '0',
    type: 'payout',
    status: 'paid',
    createdAt: '2026-10-04T18:00:00Z',
  },
  {
    id: 'tx-1003',
    employerId: '',
    workerId: 'w-1',
    workerName: 'Aziz Ishchi',
    amount: '150000',
    platformFee: '0',
    type: 'withdraw',
    status: 'pending',
    createdAt: '2026-10-04T19:00:00Z',
  },
];

describe('AdminTransactions — Ledger & Finance Management', () => {
  it('renders ribbon statistics and ledger table', () => {
    render(<AdminTransactions transactions={mockTransactions} />);

    expect(screen.getByText(/Jami aylanma/i)).toBeTruthy();
    expect(screen.getByText(/Komissiya zaxirasi/i)).toBeTruthy();
    expect(screen.getByText(/Kutilayotgan yechishlar/i)).toBeTruthy();

    expect(screen.getByText('Depozit (Muzlatilgan)')).toBeTruthy();
    expect(screen.getByText("Ishchiga To'lov (Ish haqi)")).toBeTruthy();
    expect(screen.getByText('Pul Yechish (Karta)')).toBeTruthy();
  });

  it('filters transactions by type dropdown', () => {
    render(<AdminTransactions transactions={mockTransactions} />);

    const typeSelect = screen.getByDisplayValue('Barcha turlar');
    fireEvent.change(typeSelect, { target: { value: 'deposit' } });

    expect(screen.getByText('Depozit (Muzlatilgan)')).toBeTruthy();
    expect(screen.queryByText("Ishchiga To'lov (Ish haqi)")).toBeNull();
    expect(screen.queryByText('Pul Yechish (Karta)')).toBeNull();
  });

  it('searches transactions by participant name', () => {
    render(<AdminTransactions transactions={mockTransactions} />);

    const searchInput = screen.getByPlaceholderText(/ID, ishtirokchi yoki summa.../i);
    fireEvent.change(searchInput, { target: { value: 'Mega Logistics' } });

    expect(screen.getByText('Depozit (Muzlatilgan)')).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    expect(screen.getByText('Tranzaksiyalar mavjud emas')).toBeTruthy();
  });

  it('switches to withdrawals tab and shows decision buttons for pending withdrawal', () => {
    render(<AdminTransactions transactions={mockTransactions} />);

    const withdrawalsTabBtn = screen.getByRole('button', { name: /Chiqarish So'rovlari/i });
    fireEvent.click(withdrawalsTabBtn);

    expect(screen.getByText("O'tkazish")).toBeTruthy();
    expect(screen.getByText('Rad Etish')).toBeTruthy();
  });

  it('switches to commission reports tab', () => {
    render(<AdminTransactions transactions={mockTransactions} />);

    const commissionTabBtn = screen.getByRole('button', { name: /Komissiya Hisoboti/i });
    fireEvent.click(commissionTabBtn);

    expect(screen.getByText('Bugungi Komissiya')).toBeTruthy();
    expect(screen.getByText('Oylik Jami Komissiya')).toBeTruthy();
    expect(screen.getByText('Moliyaviy Oqim Taqsimoti')).toBeTruthy();
  });
});
