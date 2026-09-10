import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { AdminUsers } from './AdminUsers';
import { AdminUser } from './types';

// The detail modal is a screen of its own with its own data fetching; the
// question here is only what the row's quick Ban button does.
vi.mock('./UserDetailModal', () => ({ UserDetailModal: () => null }));

const users: AdminUser[] = [
  { id: 'u-1', name: 'Aziz Karimov', role: 'worker', phone: '+998901234567', balance: 0 },
  { id: 'u-2', name: 'Bloklangan Foydalanuvchi', role: 'worker', isBanned: true, balance: 0 },
];

const renderUsers = () => {
  const onToggleBan = vi.fn();
  render(
    <AdminUsers
      users={users}
      onAddBalance={vi.fn()}
      onChangeRole={vi.fn()}
      onToggleBan={onToggleBan}
    />,
  );
  return { onToggleBan };
};

// vitest.config.ts does not set `globals`, so Testing Library never registers
// its own afterEach and one test's DOM would still be on the page in the next.
afterEach(cleanup);

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
const pressIn = (name: string, label: RegExp) =>
  fireEvent.click(within(rowFor(name)).getByRole('button', { name: label }));

describe('AdminUsers — banning asks before it cuts a user off', () => {
  it('does not ban on the first press', () => {
    const { onToggleBan } = renderUsers();
    pressIn('Aziz Karimov', /^ban$/i);
    expect(onToggleBan).not.toHaveBeenCalled();
  });

  it('opens the ban dialog naming the user', () => {
    renderUsers();
    pressIn('Aziz Karimov', /^ban$/i);
    expect(screen.getByText(/Foydalanuvchini Bloklash/i)).toBeTruthy();
    expect(screen.getByText('Aziz Karimov', { selector: 'strong' })).toBeTruthy();
  });

  it('cancelling leaves the account alone', () => {
    const { onToggleBan } = renderUsers();
    pressIn('Aziz Karimov', /^ban$/i);
    fireEvent.click(screen.getByRole('button', { name: /Bekor Qilish/i }));
    expect(onToggleBan).not.toHaveBeenCalled();
    expect(screen.queryByText(/Foydalanuvchini Bloklash/i)).toBeNull();
  });

  it('bans once confirmed, and carries the reason to the audit log', () => {
    const { onToggleBan } = renderUsers();
    pressIn('Aziz Karimov', /^ban$/i);
    fireEvent.change(screen.getByPlaceholderText(/Bloklanish sababini/i), {
      target: { value: "Soxta e'lonlar" },
    });
    fireEvent.click(screen.getByRole('button', { name: /Bloklashni Tasdiqlash/i }));
    const [id, wasBanned, reason] = onToggleBan.mock.calls[0];
    expect(id).toBe('u-1');
    expect(wasBanned).toBeFalsy(); // the account was not banned before this
    expect(reason).toContain('Soxta');
  });

  it('unbanning asks too, and goes through on confirm', () => {
    const { onToggleBan } = renderUsers();
    pressIn('Bloklangan Foydalanuvchi', /^unban$/i);
    expect(onToggleBan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Blokdan chiqarish$/i }));
    expect(onToggleBan).toHaveBeenCalledWith('u-2', true);
  });
});
