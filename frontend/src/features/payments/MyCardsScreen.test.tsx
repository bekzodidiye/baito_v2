vi.mock('../../store/useUIStore', () => ({ useUIStore: vi.fn((sel) => sel({})) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: vi.fn((sel) => sel({ language: 'uz', userProfile: { isVerified: true, role: 'worker', selectedRole: 'worker' } })) }));
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ setCurrentScreen: vi.fn() }),
}));
vi.mock('../../api/queries', () => ({
  fetchPaymentCardsApi: () =>
    Promise.resolve([{ id: 'card-1', type: 'uzcard', last4: '1234', bank: 'Kapital', isActive: true }]),
  deletePaymentCardApi: vi.fn(),
  updatePaymentCardApi: vi.fn(),
}));

import { MyCardsScreen } from './MyCardsScreen';

afterEach(cleanup);

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MyCardsScreen />
    </QueryClientProvider>,
  );
};

describe('MyCardsScreen — nothing announces a state change it cannot make', () => {
  it('offers no "make default" control, because the backend has no default card', async () => {
    renderScreen();
    await screen.findByText(/1234/);
    expect(screen.queryByText(/Asosiy qilish/i)).toBeNull();
  });

  it('never reports that a default was set', async () => {
    const seen: string[] = [];
    const onToast = (e: Event) => seen.push((e as CustomEvent).detail?.message);
    window.addEventListener('global-toast', onToast);
    renderScreen();
    await screen.findByText(/1234/);
    // Press everything the screen offers; none of it may claim a default.
    screen.getAllByRole('button').forEach((b) => fireEvent.click(b));
    window.removeEventListener('global-toast', onToast);
    expect(seen).not.toContain('Asosiy karta qilib belgilandi');
  });

  it('still offers the controls that do work', async () => {
    renderScreen();
    await screen.findByText(/1234/);
    expect(screen.getByText(/Ma'lumotlar/i)).toBeTruthy();
    expect(screen.getByText(/O'chirish/i)).toBeTruthy();
  });
});
