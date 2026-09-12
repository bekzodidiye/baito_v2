import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ language: 'uz' }) }));
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
  // Tab 4 is "Moliya", where the top-up lives.
  render(<UserTabsExtra detail={detail} activeTab={4} onAddBalance={onAddBalance} />);
  return { onAddBalance };
};

const openTopUp = () =>
  fireEvent.click(screen.getByRole('button', { name: /^Qo'shish$/i }));

describe("UserTabsExtra — an admin top-up cannot happen by accident", () => {
  it('keeps the form closed until it is asked for', () => {
    renderFinanceTab();
    expect(screen.queryByPlaceholderText(/Summa UZS/i)).toBeNull();
  });

  it('will not credit an account without a reason for the audit log', () => {
    const { onAddBalance } = renderFinanceTab();
    openTopUp();
    fireEvent.change(screen.getByPlaceholderText(/Summa UZS/i), {
      target: { value: '100000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Tasdiqlash$/i }));
    expect(onAddBalance).not.toHaveBeenCalled();
  });

  it('credits the account once the amount and the reason are both given', () => {
    const { onAddBalance } = renderFinanceTab();
    openTopUp();
    fireEvent.change(screen.getByPlaceholderText(/Summa UZS/i), {
      target: { value: '100000' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Sabab/i), {
      target: { value: 'Kompensatsiya' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Tasdiqlash$/i }));
    expect(onAddBalance).toHaveBeenCalledWith('u-1', 100000, 'Kompensatsiya');
  });
});
