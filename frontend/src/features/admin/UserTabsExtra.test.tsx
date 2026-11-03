vi.mock('../../store/useUIStore', () => ({ useUIStore: vi.fn((sel) => sel({})) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: vi.fn((sel) => sel({ language: 'uz', userProfile: { isVerified: true, role: 'worker', selectedRole: 'worker' } })) }));
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';


vi.mock('../../api/client', () => ({ apiClient: vi.fn().mockResolvedValue({}) }));

import { UserTabsExtra } from './UserTabsExtra';
import { AdminUserDetailResponse } from './types';

afterEach(cleanup);

const detail = {
  user: { id: 'u-1', name: 'Aziz Karimov', role: 'worker', balance: 50000, adminNotes: [] },
  sessions: [],
  transactions: [],
  orders: [],
  reviews: [],
} as unknown as AdminUserDetailResponse;

const renderFinanceTab = () => {
  const onAddBalance = vi.fn();
  // Tab 4 is "Moliya"
  render(<UserTabsExtra detail={detail} activeTab={4} onAddBalance={onAddBalance} />);
  return { onAddBalance };
};

describe("UserTabsExtra — Worker financial dashboard", () => {
  it('does not render retired manual balance top-up controls', () => {
    renderFinanceTab();
    expect(screen.queryByRole('button', { name: /^Qo'shish$/i })).toBeNull();
    expect(screen.queryByPlaceholderText(/Summa UZS/i)).toBeNull();
  });

  it('renders the 3 tailored financial cards for worker', () => {
    renderFinanceTab();
    expect(screen.getByText(/Faol Ishlar Byudjeti/i)).toBeDefined();
    expect(screen.getByText(/Jami Ishlangan/i)).toBeDefined();
    expect(screen.getByText(/Yechib Olingan/i)).toBeDefined();
  });

  it('renders worker history section with smart ledger filters', () => {
    renderFinanceTab();
    expect(screen.getByText(/Tranzaksiyalar va Chiqimlar Tarixi/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Kirimlar/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Chiqimlar/i })).toBeDefined();
  });

  it('never displays invoices for worker even if present in payload, and reflects completed work as earnings', () => {
    const workerWithInvoices = {
      user: { id: 'w-1', name: 'Ozodbek Salimov', role: 'worker', balance: 0, adminNotes: [] },
      sessions: [],
      transactions: [
        { id: 'tx-payout-1', amount: 150000, type: 'payout', status: 'paid', createdAt: '2026-10-02T15:18:00Z' }
      ],
      orders: [
        { id: 'job-1', title: 'Novvoy yordamchisi', amount: 220000, status: 'completed', date: '2026-10-01T10:00:00Z' }
      ],
      reviews: [],
      invoices: [
        { id: 'inv-1', invoiceNumber: 'INV-2026-8800', amount: 310000, status: 'payment_declared' },
        { id: 'inv-2', invoiceNumber: 'INV-2026-4471', amount: 310000, status: 'payment_declared' }
      ],
    } as unknown as AdminUserDetailResponse;

    render(<UserTabsExtra detail={workerWithInvoices} activeTab={4} onAddBalance={vi.fn()} />);

    // Invoices must NEVER be displayed for workers
    expect(screen.queryByText(/INV-2026-8800/i)).toBeNull();
    expect(screen.queryByText(/INV-2026-4471/i)).toBeNull();
    expect(screen.queryByText(/Invoislar \(/i)).toBeNull();

    // Completed work and payouts MUST be present
    expect(screen.getAllByText(/Novvoy yordamchisi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/220 000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/150 000/i).length).toBeGreaterThan(0);
  });
});
