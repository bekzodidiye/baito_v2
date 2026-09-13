import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-router-dom', () => ({ useParams: () => ({ token: 'tok-123' }) }));

const INVOICE = {
  invoiceNumber: 'INV-20260907-ABCD1234',
  amount: 310_000,
  company: 'Korzinka MChJ',
  jobTitle: 'Omborxona yordamchisi',
  workDate: '2026-09-02',
  location: 'Toshkent',
  requisites: [
    { label: 'Qabul qiluvchi', value: 'Baito MChJ' },
    { label: 'Hisob raqami', value: '20208000900000000001' },
    { label: 'MFO', value: '00873' },
  ],
  methods: [{ id: 'bank_transfer', label: "Bank o'tkazmasi", hint: 'Rekvizitlar tayyor' }],
  status: 'invoiced',
  paidMethod: null,
  paidReference: null,
  declaredAt: null,
};

let invoice: unknown = INVOICE;
let fetchFails: Error | null = null;
const declare = vi.fn();

vi.mock('../../api/queries', () => ({
  fetchInvoiceApi: () => (fetchFails ? Promise.reject(fetchFails) : Promise.resolve(invoice)),
  declareInvoicePaymentApi: (...args: unknown[]) => declare(...args),
}));

import { InvoicePayScreen } from './InvoicePayScreen';

afterEach(() => {
  cleanup();
  invoice = INVOICE;
  fetchFails = null;
  declare.mockReset();
});

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <InvoicePayScreen />
    </QueryClientProvider>,
  );
};

describe('InvoicePayScreen', () => {
  it('arrives with the amount and the account number already filled in', async () => {
    renderScreen();

    // The whole point: the payer types nothing.
    expect(await screen.findByText(/310 000/)).toBeTruthy();
    expect(screen.getByText('20208000900000000001')).toBeTruthy();
    expect(screen.getByText('00873')).toBeTruthy();
    expect(screen.getByText(/INV-20260907-ABCD1234/)).toBeTruthy();
  });

  it('preselects the only payment method there is', async () => {
    renderScreen();

    const radio = await screen.findByRole('radio', { hidden: true }) as HTMLInputElement;
    // A one-option radio group the payer still has to click is a step for
    // nothing — and it would leave the confirm button disabled.
    expect(radio.checked).toBe(true);
    expect((screen.getByRole('button', { name: /tasdiqlash/i }) as HTMLButtonElement).disabled)
      .toBe(false);
  });

  it('sends the chosen method and the reference, then shows it is recorded', async () => {
    declare.mockResolvedValue({ ...INVOICE, status: 'payment_declared',
      declaredAt: '2026-09-07T10:00:00Z', paidMethod: 'bank_transfer', paidReference: 'PO-4471' });
    renderScreen();

    fireEvent.change(await screen.findByLabelText(/topshirig'i raqami/i),
      { target: { value: 'PO-4471' } });
    fireEvent.click(screen.getByRole('button', { name: /tasdiqlash/i }));

    await waitFor(() => expect(declare).toHaveBeenCalledWith(
      'tok-123', { method: 'bank_transfer', reference: 'PO-4471' }));

    expect(await screen.findByText(/to'lov qayd etildi/i)).toBeTruthy();
    // Says plainly that this is the payer's word, not a cleared payment.
    expect(screen.getByText(/bank ko'chirmasi bilan solishtirilgandan/i)).toBeTruthy();
  });

  it('leaves the reference out when it was not filled in', async () => {
    declare.mockResolvedValue({ ...INVOICE, declaredAt: '2026-09-07T10:00:00Z' });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: /tasdiqlash/i }));

    await waitFor(() => expect(declare).toHaveBeenCalledWith(
      'tok-123', { method: 'bank_transfer', reference: undefined }));
  });

  it('shows an invoice already declared as done, with no way to pay it twice', async () => {
    invoice = { ...INVOICE, status: 'payment_declared',
      declaredAt: '2026-09-07T10:00:00Z', paidReference: 'PO-4471' };
    renderScreen();

    expect(await screen.findByText(/to'lov qayd etildi/i)).toBeTruthy();
    expect(screen.getByText('PO-4471')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /tasdiqlash/i })).toBeNull();
  });

  it('explains a dead link instead of rendering an empty invoice', async () => {
    fetchFails = new Error("Havola yaroqsiz yoki muddati tugagan. Yangi hisob-faktura so'rang.");
    renderScreen();

    expect(await screen.findByText(/hisob-faktura ochilmadi/i)).toBeTruthy();
    expect(screen.getByText(/muddati tugagan/i)).toBeTruthy();
  });

  it('keeps the confirm button quiet about a failure it did not cause', async () => {
    declare.mockRejectedValue(new Error('Bu hisob-faktura bo\'yicha to\'lov allaqachon qayd etilgan'));
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: /tasdiqlash/i }));

    expect(await screen.findByText(/allaqachon qayd etilgan/i)).toBeTruthy();
  });
});
