import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AdminPayouts } from './AdminPayouts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(async (url: string) => {
    if (url.includes('/admin/withdrawals')) {
      return {
        total: 1,
        items: [
          {
            id: 'w-1',
            userId: 'u-1',
            userName: 'Ali Valiyev',
            userPhone: '+998901112233',
            bankCardMask: '8600 •••• •••• 1234',
            amountUzs: 150000,
            status: 'pending',
            reference: null,
            createdAt: '2026-10-04T12:00:00Z',
          },
        ],
      };
    }
    if (url.includes('/admin/payouts')) {
      return [
        {
          id: 'p-1',
          jobId: 'j-1',
          jobTitle: 'Senior Frontend Developer',
          company: 'Baito Logistics MChJ',
          workerName: 'Ozodbek Salimov',
          amount: 520000,
          receiptUrl: 'https://example.com/receipt.jpg',
          status: 'paid',
          paidAt: '2026-10-04T14:00:00Z',
          invoiceNumber: 'INV-20261004-ABC12345',
          invoiceAmount: 520000,
          invoiceSentTo: 'employer@baito.uz',
          invoiceSentAt: '2026-10-04T14:30:00Z',
          invoicePaidMethod: 'bank_transfer',
          invoicePaidReference: 'TX-9988',
          invoicePaidDeclaredAt: '2026-10-04T15:00:00Z',
          invoicePaidReceiptUrl: 'https://example.com/bank_slip.jpg',
          invoiceConfirmedAt: null,
        },
      ];
    }
    if (url.includes('/admin/settings')) {
      return {
        payoutCompanyName: 'Baito MChJ',
        payoutBankName: 'Ipoteka Bank',
        payoutBankAccount: '20208000900000000001',
        payoutBankMfo: '00873',
        payoutCompanyInn: '123456789',
        payoutCompanyAddress: 'Toshkent sh.',
      };
    }
    return {};
  }),
  unwrapList: vi.fn((data: any) => (Array.isArray(data) ? data : data?.items ?? [])),
}));

afterEach(cleanup);

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPayouts />
    </QueryClientProvider>
  );
};

describe('AdminPayouts — Modern Payouts & Invoices UI', () => {
  it('renders financial KPI ribbon cards and payout items', async () => {
    renderWithClient();

    // Check KPI cards
    expect(screen.getByText(/Kutilayotgan Yechishlar/i)).toBeTruthy();
    expect(screen.getByText(/To'langan Ish Haqlar/i)).toBeTruthy();
    expect(screen.getByText(/Tasdiqlangan Fakturalar/i)).toBeTruthy();
    expect(screen.getByText(/Baito Rekvizitlari/i)).toBeTruthy();

    // Wait for payouts table to populate
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeTruthy();
      expect(screen.getByText('Baito Logistics MChJ')).toBeTruthy();
      expect(screen.getByText('Ozodbek Salimov')).toBeTruthy();
      expect(screen.getByText('INV-20261004-ABC12345')).toBeTruthy();
      expect(screen.getByText(/To'lov e'lon qilingan/i)).toBeTruthy();
      expect(screen.getByText(/To'lovni tasdiqlash/i)).toBeTruthy();
    });
  });

  it('opens bank reconciliation modal when clicking to confirm payment', async () => {
    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText('INV-20261004-ABC12345')).toBeTruthy();
    });

    const confirmBtn = screen.getByRole('button', { name: /To'lovni tasdiqlash/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bank to'lovini solishtirish va tasdiqlash/i)).toBeTruthy();
      expect(screen.getByText(/Men Baito bank hisobiga/i)).toBeTruthy();
      expect(screen.getByText(/Baito Rasmiy Bank Rekvizitlari/i)).toBeTruthy();
    });
  });

  it('allows searching within payouts list', async () => {
    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(/Ish, korxona, ishchi yoki INV- raqami.../i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Job' } });

    await waitFor(() => {
      expect(screen.getByText("To'lovlar topilmadi")).toBeTruthy();
    });

    fireEvent.change(searchInput, { target: { value: 'Frontend' } });
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeTruthy();
    });
  });

  it('switches to withdrawal requests tab and displays withdrawals with decision buttons', async () => {
    renderWithClient();

    const withdrawalTabBtn = screen.getByRole('button', { name: /Yechish so'rovlari/i });
    fireEvent.click(withdrawalTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Ali Valiyev')).toBeTruthy();
      expect(screen.getByText('8600 •••• •••• 1234')).toBeTruthy();
      expect(screen.getByText('Tasdiqlash')).toBeTruthy();
      expect(screen.getByText('Rad etish')).toBeTruthy();
    });
  });

  it('switches to bank details form tab', async () => {
    renderWithClient();

    const bankTabBtn = screen.getByRole('button', { name: /Bank rekvizitlari/i });
    fireEvent.click(bankTabBtn);

    await waitFor(() => {
      expect(screen.getByText("To'lov rekvizitlarimiz")).toBeTruthy();
      expect(screen.getByDisplayValue('Ipoteka Bank')).toBeTruthy();
      expect(screen.getByDisplayValue('20208000900000000001')).toBeTruthy();
    });
  });
});
