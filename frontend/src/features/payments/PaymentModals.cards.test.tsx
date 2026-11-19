import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PaymentModals } from './PaymentModals';
import * as api from '../../api/queries';

vi.mock('../../api/queries', () => ({
  requestWithdrawalApi: vi.fn(),
  deletePaymentCardApi: vi.fn().mockResolvedValue({ success: true }),
  updatePaymentCardApi: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../utils/toast', () => ({
  showToast: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('PaymentModals card actions', () => {
  const mockCards = [
    { id: 'card-1', last4: '8600', bankName: 'Uzcard', isDefault: true },
    { id: 'card-2', last4: '9860', bankName: 'Humo', isDefault: false },
  ];

  it('renders card items and calls updatePaymentCardApi when make default is clicked', async () => {
    const handleClose = vi.fn();
    render(
      <PaymentModals
        isOpen={true}
        onClose={handleClose}
        type="myCards"
        currentBalance={100000}
        savedCards={mockCards}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getAllByText('**** 8600').length).toBeGreaterThan(0);
    expect(screen.getAllByText('**** 9860').length).toBeGreaterThan(0);

    const makeDefaultBtn = screen.getAllByLabelText(/Asosiy qilish|Сделать основной|Make Default/i)[0];
    expect(makeDefaultBtn).toBeDefined();

    fireEvent.click(makeDefaultBtn);
    await waitFor(() => {
      expect(api.updatePaymentCardApi).toHaveBeenCalledWith('card-2', { isDefault: true });
    });
  });

  it('calls deletePaymentCardApi when delete card is clicked', async () => {
    const handleClose = vi.fn();
    render(
      <PaymentModals
        isOpen={true}
        onClose={handleClose}
        type="myCards"
        currentBalance={100000}
        savedCards={mockCards}
      />,
      { wrapper: createWrapper() }
    );

    const deleteBtns = screen.getAllByLabelText(/O'chirish|Удалить|Delete/i);
    expect(deleteBtns.length).toBeGreaterThan(0);

    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(api.deletePaymentCardApi).toHaveBeenCalledWith('card-1');
    });
  });
});
