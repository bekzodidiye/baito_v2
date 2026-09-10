import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const apiClient = vi.fn(async () => ({ success: true }));

vi.mock('../../api/client', () => ({
  apiClient: (...args: unknown[]) => apiClient(...(args as [])),
  unwrapList: (x: unknown) => (Array.isArray(x) ? x : []),
}));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({}) }));

import { useAdminData } from './useAdminData';

/**
 * The admin panel announces what it did by dispatching `global-toast`, the
 * same event ToastContainer listens for. Collecting those events is how the
 * round-4 sweep measured toasts in the browser, so the assertions here mean
 * the same thing they meant there: did the interface say anything.
 */
const collectToasts = () => {
  const seen: string[] = [];
  const onToast = (e: Event) => seen.push((e as CustomEvent).detail?.message);
  window.addEventListener('global-toast', onToast);
  return { seen, stop: () => window.removeEventListener('global-toast', onToast) };
};

const renderAdminData = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAdminData(), { wrapper });
};

describe('useAdminData — an admin action that succeeds says so', () => {
  let toasts: ReturnType<typeof collectToasts>;

  beforeEach(() => {
    apiClient.mockClear();
    apiClient.mockResolvedValue({ success: true } as never);
    toasts = collectToasts();
  });

  afterEach(() => toasts.stop());

  it('confirms a ban', async () => {
    const { result } = renderAdminData();
    await result.current.toggleBan('user-1', false);
    await waitFor(() => expect(toasts.seen).toContain('Foydalanuvchi bloklandi'));
  });

  it('confirms an unban', async () => {
    const { result } = renderAdminData();
    await result.current.toggleBan('user-1', true);
    await waitFor(() => expect(toasts.seen).toContain('Foydalanuvchi blokdan chiqarildi'));
  });

  it('confirms a job status change', async () => {
    const { result } = renderAdminData();
    await result.current.changeJobStatus('job-1', 'active');
    await waitFor(() => expect(toasts.seen).toContain("E'lon holati o'zgardi"));
  });

  it('confirms a job deletion', async () => {
    const { result } = renderAdminData();
    await result.current.deleteJob('job-1');
    await waitFor(() => expect(toasts.seen).toContain("E'lon o'chirib tashlandi"));
  });

  it('confirms saved settings', async () => {
    const { result } = renderAdminData();
    await result.current.updateSettings({ commissionRate: 10 } as never);
    await waitFor(() => expect(toasts.seen).toContain('Tizim sozlamalari saqlandi'));
  });

  it('confirms a broadcast reaching every user', async () => {
    const { result } = renderAdminData();
    await result.current.sendBroadcast('Sarlavha', 'Matn', 'all');
    await waitFor(() =>
      expect(toasts.seen).toContain('Ommaviy xabarnoma muvaffaqiyatli yuborildi'),
    );
  });
});
