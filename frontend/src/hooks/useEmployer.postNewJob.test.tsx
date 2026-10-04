vi.mock('../store/useAuthStore', () => ({
  useAuthStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({ language: 'uz', userProfile: { isVerified: true, firstName: 'Anvar' } })),
}));

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type ApiInit = { method?: string; body?: string };
const apiClient = vi.fn(async (_path: string, _init?: ApiInit): Promise<unknown> => ({}));

vi.mock('../api/client', () => ({
  apiClient: (...args: unknown[]) => apiClient(...(args as [string, ApiInit?])),
  unwrapList: (x: unknown) => (Array.isArray(x) ? x : []),
}));

import { useEmployer } from './useEmployer';

/**
 * What the hook actually put on the wire.
 *
 * The assertions below read the POST body rather than the arguments the caller
 * passed, because the thing under test is precisely the gap between the two:
 * the hook used to fill that gap in with figures of its own.
 */
const postedBody = () => {
  const call = apiClient.mock.calls.find(c => c[0] === '/jobs' && c[1]?.method === 'POST');
  if (!call) throw new Error('no posting was sent');
  return JSON.parse(String(call[1]?.body)) as Record<string, unknown>;
};

const collectToasts = () => {
  const seen: string[] = [];
  const onToast = (e: Event) => seen.push((e as CustomEvent).detail?.message);
  window.addEventListener('global-toast', onToast);
  return { seen, stop: () => window.removeEventListener('global-toast', onToast) };
};

const renderEmployer = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useEmployer(), { wrapper });
};

/**
 * A posting is what escrow freezes money against and what a worker is paid
 * from, so every figure on it has to be one the employer typed.
 *
 * The POST body used to substitute its own for anything left blank: a wage of
 * "200000 UZS", a location of Toshkent, today's date, a 09:00-18:00 shift.
 * `postNewJob` is the only way the mutation is reachable and JobPostForm is
 * its only caller (see JobPostForm.guard.test.tsx for the validation that
 * made the substitutions unreachable), so removing them changes no working
 * path — it removes the way a wrong figure could have been published.
 */
describe('useEmployer — posting a job sends the employer figures, not invented ones', () => {
  let toasts: ReturnType<typeof collectToasts>;

  beforeEach(() => {
    apiClient.mockClear();
    apiClient.mockResolvedValue({});
    toasts = collectToasts();
  });

  afterEach(() => toasts.stop());

  it('sends what was typed, unchanged', async () => {
    const { result } = renderEmployer();

    await result.current.postNewJob({
      title: 'Omborchi',
      salary: '450000 UZS',
      location: 'Samarqand, Registon',
      rawLocation: 'Samarqand, Registon',
      durationLabel: '2-3 kunlik',
      description: 'Omborda yuk ortish va tushirish ishlari.',
      workDate: '2026-03-14',
      workTime: '07:00 - 15:00',
    });

    await waitFor(() => expect(postedBody()).toMatchObject({
      salary: '450000 UZS',
      location: 'Samarqand, Registon',
      rawLocation: 'Samarqand, Registon',
      durationLabel: '2-3 kunlik',
      workDate: '2026-03-14',
      workTime: '07:00 - 15:00',
    }));
  });

  it('invents no wage, location, date or shift for a field left blank', async () => {
    const { result } = renderEmployer();

    await result.current.postNewJob({ title: 'Omborchi' });

    await waitFor(() => expect(apiClient).toHaveBeenCalledWith('/jobs', expect.anything()));
    const body = postedBody();

    for (const field of ['salary', 'location', 'rawLocation', 'durationLabel', 'workDate', 'workTime']) {
      expect(body[field], `${field} was filled in on the employer's behalf`).toBeUndefined();
    }

    // The specific figures that used to be published in the employer's name.
    const wire = JSON.stringify(body);
    expect(wire).not.toContain('200000 UZS');
    expect(wire).not.toContain('Toshkent');
    expect(wire).not.toContain('1 kunlik');
    expect(wire).not.toContain('09:00 - 18:00');
    expect(wire).not.toContain(new Date().toISOString().split('T')[0]);
  });

  it("keeps the employer's own wording rather than a stand-in description", async () => {
    const { result } = renderEmployer();

    await result.current.postNewJob({ title: 'Omborchi', responsibilities: '' });

    await waitFor(() => expect(postedBody().description).toBe(''));
  });

  it("shows the employer the API's reason for refusing", async () => {
    apiClient.mockImplementation(async (path: string) => {
      if (path === '/jobs') throw new Error("Maosh musbat bo'lishi kerak");
      return {};
    });
    const { result } = renderEmployer();

    await expect(result.current.postNewJob({ title: 'Omborchi' })).rejects.toThrow();
    await waitFor(() => expect(toasts.seen).toContain("Xato: Maosh musbat bo'lishi kerak"));
  });
});
