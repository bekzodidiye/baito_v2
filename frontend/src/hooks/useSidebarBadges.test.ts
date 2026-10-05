/** A menu item says when something is waiting behind it.
 *
 *  Only Notifications carried a badge. An application landing on an employer's
 *  desk, or a message waiting in a chat, showed nothing — the only way to find
 *  out was to open the screen and look.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const state = vi.hoisted(() => ({
  isLoggedIn: true,
  role: 'employer' as 'employer' | 'worker',
  applications: [] as unknown[],
  chats: [] as unknown[],
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      isLoggedIn: state.isLoggedIn,
      userProfile: { selectedRole: state.role },
    }),
}));

vi.mock('../api/client', () => ({
  apiClient: vi.fn(async (path: string) => {
    if (path === '/applications/employer') return state.applications;
    if (path === '/chats') return state.chats;
    throw new Error('unexpected path ' + path);
  }),
}));

import { useSidebarBadges } from './useSidebarBadges';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
};

beforeEach(() => {
  state.isLoggedIn = true;
  state.role = 'employer';
  state.applications = [];
  state.chats = [];
});

describe('the counts on a menu item', () => {
  it('counts only applications nobody has answered yet', async () => {
    state.applications = [
      { status: 'applied' }, { status: 'applied' },
      { status: 'hired' }, { status: 'rejected' }, { status: 'completed' },
    ];
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.pendingApplications).toBe(2));
  });

  it('adds up the unread messages across conversations', async () => {
    state.chats = [{ unreadCount: 3 }, { unreadCount: 0 }, { unreadCount: 1 }];
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.unreadMessages).toBe(4));
  });

  it('is zero when there is nothing waiting', async () => {
    state.applications = [{ status: 'hired' }];
    state.chats = [{ unreadCount: 0 }];
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.unreadMessages).toBe(0));
    expect(result.current.pendingApplications).toBe(0);
  });

  it('does not ask for an employer list as a worker', async () => {
    state.role = 'worker';
    state.chats = [{ unreadCount: 2 }];
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    // Messages still count for a worker; applications are not their screen.
    await waitFor(() => expect(result.current.unreadMessages).toBe(2));
    expect(result.current.pendingApplications).toBe(0);
  });

  it('asks for nothing at all when signed out', async () => {
    state.isLoggedIn = false;
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    const { apiClient } = await import('../api/client');
    expect(apiClient).not.toHaveBeenCalled();
    expect(result.current.pendingApplications).toBe(0);
    expect(result.current.unreadMessages).toBe(0);
  });

  it('survives a response that is not the shape it expects', async () => {
    state.applications = null as unknown as unknown[];
    state.chats = { items: [{ unreadCount: 5 }] } as unknown as unknown[];
    const { result } = renderHook(() => useSidebarBadges(), { wrapper });

    await waitFor(() => expect(result.current.unreadMessages).toBe(5));
    expect(result.current.pendingApplications).toBe(0);
  });
});
