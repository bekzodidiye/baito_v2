vi.mock('../../store/useUIStore', () => ({ useUIStore: vi.fn() }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: vi.fn() }));
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let rows: unknown[] = [];
let loggedIn = true;
const setUnreadNotificationsCount = vi.fn();
const chime = vi.fn();

vi.mock('../../api/queries', () => ({
  fetchNotificationsApi: () => Promise.resolve(rows),
}));

vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ setCurrentScreen: vi.fn() }),
}));
vi.mock('../../utils/chime', () => ({ chime: () => chime() }));

import { NotificationWatcher } from './NotificationWatcher';

const notif = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: `Xabar ${id}`, message: 'matn', isRead: false, ...over,
});

let client: QueryClient;
const renderWatcher = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationWatcher />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  rows = [];
  loggedIn = true;
  setUnreadNotificationsCount.mockClear();
  chime.mockClear();
  vi.mocked(useUIStore).mockImplementation((sel: any) => sel({ setUnreadNotificationsCount }));
  vi.mocked(useAuthStore).mockImplementation((sel: any) => sel({ isLoggedIn: loggedIn, language: 'uz' }));
});
afterEach(cleanup);

describe('NotificationWatcher', () => {
  it('does not replay old notifications on page load', async () => {
    rows = [notif('1'), notif('2')];
    renderWatcher();
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalledWith(2));
    expect(screen.queryByRole('status')).toBeNull();
    expect(chime).not.toHaveBeenCalled();
  });

  it('announces one that arrives while the page is open', async () => {
    rows = [notif('1')];
    renderWatcher();
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalled());

    rows = [notif('2', { title: 'Sizni ishga qabul qilishdi' }), notif('1')];
    await client.refetchQueries({ queryKey: ['notifications'] });

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByText('Sizni ishga qabul qilishdi')).toBeTruthy();
    expect(chime).toHaveBeenCalledTimes(1);
  });

  it('keeps the unread badge current from any screen', async () => {
    rows = [notif('1')];
    renderWatcher();
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalledWith(1));

    rows = [notif('1'), notif('2'), notif('3', { isRead: true })];
    await client.refetchQueries({ queryKey: ['notifications'] });
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalledWith(2));
  });

  it('says how many when several arrive at once', async () => {
    rows = [notif('1')];
    renderWatcher();
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalled());

    rows = [notif('9'), notif('8'), notif('1')];
    await client.refetchQueries({ queryKey: ['notifications'] });
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByText(/va yana 1 ta/)).toBeTruthy();
  });

  it('does not announce something already read', async () => {
    rows = [notif('1')];
    renderWatcher();
    await waitFor(() => expect(setUnreadNotificationsCount).toHaveBeenCalled());

    rows = [notif('2', { isRead: true }), notif('1')];
    await client.refetchQueries({ queryKey: ['notifications'] });
    await new Promise(r => setTimeout(r, 40));
    expect(screen.queryByRole('status')).toBeNull();
    expect(chime).not.toHaveBeenCalled();
  });

  it('writes nothing to the store while logged out, however often it renders', async () => {
    // The write itself was the loop: the store update re-rendered the
    // provider, the provider re-rendered this, useQuery's inline [] default
    // came back with a new identity, the effect fired again. Logged out — the
    // landing page, and now the public invoice page — that never terminated.
    loggedIn = false;
    vi.mocked(useAuthStore).mockImplementation((sel: any) => sel({ isLoggedIn: loggedIn, language: 'uz' }));

    const { rerender } = renderWatcher();

    for (let i = 0; i < 5; i++) {
      rerender(
        <QueryClientProvider client={client}>
          <NotificationWatcher />
        </QueryClientProvider>,
      );
    }
    await waitFor(() => expect(document.body).toBeTruthy());

    expect(setUnreadNotificationsCount).not.toHaveBeenCalled();
  });
});
