import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const logoutAllOtherSessionsApi = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ userProfile: {}, setUserProfile: vi.fn(), language: 'uz' }),
}));
vi.mock('../../hooks/useCurrentScreen', () => ({
  useCurrentScreen: () => ({ currentScreen: 'security', setCurrentScreen: vi.fn() }),
}));
const changePasswordApi = vi.fn().mockResolvedValue({});

vi.mock('../../api/queries', () => ({
  fetchActiveSessionsApi: vi.fn().mockResolvedValue([]),
  logoutSessionApi: vi.fn(),
  logoutAllOtherSessionsApi: (...a: unknown[]) => logoutAllOtherSessionsApi(...(a as [])),
  changePasswordApi: (...a: unknown[]) => changePasswordApi(...(a as [])),
  updateUserProfileApi: vi.fn(),
}));

import { SecurityScreen } from './SecurityScreen';

afterEach(cleanup);

// vitest.config.ts sets restoreMocks, which resets a vi.fn()'s implementation
// between tests — so the resolved value has to be set per test, not once.
beforeEach(() => {
  logoutAllOtherSessionsApi.mockReset();
  logoutAllOtherSessionsApi.mockResolvedValue({ success: true });
});

const pressLogoutAll = () =>
  fireEvent.click(screen.getByRole('button', { name: /Barcha qurilmalardan chiqish/i }));

describe('SecurityScreen — ending every session asks first', () => {
  it('does not end the sessions on the first press', () => {
    render(<SecurityScreen />);
    pressLogoutAll();
    expect(logoutAllOtherSessionsApi).not.toHaveBeenCalled();
  });

  it('says what will happen to the other devices', () => {
    render(<SecurityScreen />);
    pressLogoutAll();
    expect(screen.getByRole('dialog').textContent).toMatch(/qaytadan kirishga/i);
  });

  it('cancelling leaves every device signed in', () => {
    render(<SecurityScreen />);
    pressLogoutAll();
    fireEvent.click(screen.getByRole('button', { name: /Bekor qilish/i }));
    expect(logoutAllOtherSessionsApi).not.toHaveBeenCalled();
  });

  it('ends them once confirmed', async () => {
    render(<SecurityScreen />);
    pressLogoutAll();
    fireEvent.click(screen.getByRole('button', { name: /^Chiqish$/i }));
    await waitFor(() => expect(logoutAllOtherSessionsApi).toHaveBeenCalled());
  });
});

describe('SecurityScreen — no control that does nothing', () => {
  it('offers no search box over three settings rows', () => {
    render(<SecurityScreen />);
    // The magnifier revealed a field whose value was never read, so typing
    // filtered nothing. Three rows do not need a search; it is gone.
    expect(screen.queryByPlaceholderText(/izlash/i)).toBeNull();
    expect(screen.getByText(/Parolni o'zgartirish/i)).toBeTruthy();
  });
});

describe('SecurityScreen — changing a password takes the old one', () => {
  it('opens a form rather than changing anything', () => {
    changePasswordApi.mockClear();
    render(<SecurityScreen />);
    fireEvent.click(screen.getByText(/Parolni o'zgartirish/i));
    expect(changePasswordApi).not.toHaveBeenCalled();
    // Three fields: current, new, and the repeat.
    expect(screen.getAllByLabelText(/parol/i).length).toBeGreaterThanOrEqual(3);
  });
});
