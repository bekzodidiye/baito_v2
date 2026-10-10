vi.mock('../../store/useUIStore', () => ({ useUIStore: vi.fn((sel) => sel({})) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: vi.fn((sel) => sel({ language: 'uz', userProfile: { isVerified: true, role: 'worker', selectedRole: 'worker' } })) }));
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ setCurrentScreen: vi.fn() }),
}));
vi.mock('./PaymentModals', () => ({ PaymentModals: () => null }));
// Default: a worker with no history at all — the state the screen used to
// fill in. setTransactions() gives a test some real rows instead.
let rows: unknown[] = [];
const setTransactions = (t: unknown[]) => { rows = t; };

vi.mock('../../api/queries', () => ({
  fetchPaymentCardsApi: vi.fn().mockResolvedValue([]),
  addPaymentCardApi: vi.fn(),
  fetchTransactionsApi: () => Promise.resolve(rows),
  requestWithdrawalApi: vi.fn(),
  fetchUserProfileApi: vi.fn().mockResolvedValue({ balance: 0 }),
}));

import { PaymentsScreen } from './PaymentsScreen';

afterEach(() => { cleanup(); rows = []; });

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PaymentsScreen />
    </QueryClientProvider>,
  );
};

describe('PaymentsScreen — an empty history stays empty', () => {
  it('shows the empty state', async () => {
    renderScreen();
    expect(await screen.findByText(/Tranzaksiyalar yo'q/i)).toBeTruthy();
  });

  it('invents no transactions to fill the space', async () => {
    renderScreen();
    await screen.findByText(/Tranzaksiyalar yo'q/i);
    const page = document.body.textContent ?? '';
    // The placeholder rows that used to render underneath the empty state.
    expect(page).not.toContain('Lobia Machida');
    expect(page).not.toContain('45,000');
    expect(page).not.toContain('20,000');
    expect(page).not.toContain('4521');
    expect(page).not.toContain('2023');
  });

  it('shows no completed-payment badge when nothing was paid', async () => {
    renderScreen();
    await screen.findByText(/Tranzaksiyalar yo'q/i);
    // "Bajarildi" is rendered only by a transaction row. ("Kutilmoqda" is not
    // a usable signal here — the balance summary cards above use it too.)
    expect(document.body.textContent ?? '').not.toContain('Bajarildi');
  });
});

describe('PaymentsScreen — the search control searches', () => {
  const tx = (over: Record<string, unknown>) => ({
    id: 'tx-1',
    type: 'withdraw',
    status: 'completed',
    amount: 20000,
    createdAt: '2026-09-01T09:15:00Z',
    ...over,
  });

  it('reveals a search field when the magnifier is pressed', async () => {
    renderScreen();
    await screen.findByText(/Tranzaksiyalar yo'q/i);
    expect(screen.queryByPlaceholderText(/qidirish/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /qidirish/i }));
    expect(screen.getByPlaceholderText(/qidirish/i)).toBeTruthy();
  });

  it('narrows the list to what was typed', async () => {
    setTransactions([
      tx({ id: 'tx-1', type: 'withdraw', amount: 20000 }),
      tx({ id: 'tx-2', type: 'deposit', amount: 450000 }),
    ]);
    renderScreen();
    await screen.findByText(/Mablag' yechish/i);
    // "Kirim" labels both the filter chip and the deposit row, and the amount
    // also appears in the summary cards — so count the occurrences instead of
    // looking for a unique one. Two now: the chip and the row.
    expect(screen.getAllByText('Kirim')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /qidirish/i }));
    fireEvent.change(screen.getByPlaceholderText(/qidirish/i), {
      target: { value: 'yechish' },
    });

    expect(screen.getByText(/Mablag' yechish/i)).toBeTruthy();
    // One now: the chip. The deposit row is gone.
    expect(screen.getAllByText('Kirim')).toHaveLength(1);
  });

  it('says nothing matched, rather than claiming there is no history', async () => {
    setTransactions([tx({})]);
    renderScreen();
    await screen.findByText(/Mablag' yechish/i);

    fireEvent.click(screen.getByRole('button', { name: /qidirish/i }));
    fireEvent.change(screen.getByPlaceholderText(/qidirish/i), {
      target: { value: 'zzzzz' },
    });

    const page = document.body.textContent ?? '';
    expect(page).toMatch(/topilmadi/i);
    // The screen must not tell a user with real history that they have none.
    expect(page).not.toContain('Hozircha hech qanday');
  });
});
