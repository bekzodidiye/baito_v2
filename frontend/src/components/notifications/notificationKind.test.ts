import { describe, it, expect } from 'vitest';
import { notificationKind, notificationDestination } from './notificationKind';

describe('notificationKind — the types the backend actually sends', () => {
  it('recognises the ones the screen used to miss', () => {
    // Every one of these arrived as 'system' before, so every row in the list
    // carried the same icon and the same dead "see details" link.
    expect(notificationKind('hired')).toBe('apply');
    expect(notificationKind('start_confirmed')).toBe('apply');
    expect(notificationKind('rejected')).toBe('apply');
    expect(notificationKind('transaction')).toBe('payment');
    expect(notificationKind('payout')).toBe('payment');
    expect(notificationKind('ticket')).toBe('support');
    expect(notificationKind('user')).toBe('profile');
  });

  it('handles the misspelling that never matched', () => {
    // The screen tested for 'start_request'; the backend sends
    // 'start_requested', so the one job type it did know never fired.
    expect(notificationKind('start_requested')).toBe('apply');
  });

  it('is case-insensitive and survives a missing type', () => {
    expect(notificationKind('HIRED')).toBe('apply');
    expect(notificationKind(undefined)).toBe('system');
    expect(notificationKind('')).toBe('system');
  });

  it('falls back to system for something it has never seen', () => {
    expect(notificationKind('brand_new_thing')).toBe('system');
  });
});

describe('notificationDestination — where "see details" goes', () => {
  it('sends each kind somewhere useful', () => {
    expect(notificationDestination('message')).toBe('messages');
    expect(notificationDestination('job')).toBe('jobs');
    expect(notificationDestination('apply')).toBe('calendar');
    expect(notificationDestination('payment')).toBe('payments');
    expect(notificationDestination('support')).toBe('support');
    expect(notificationDestination('profile')).toBe('profile');
  });

  it('stays put for a plain system message', () => {
    // Nothing to open — the notification is the whole content.
    expect(notificationDestination('system')).toBe('notifications');
  });

  it('gives a real destination to a hired notification', () => {
    // The end-to-end case from the report: a worker is told they were
    // assigned, taps "see details", and should land on their calendar.
    expect(notificationDestination(notificationKind('hired'))).toBe('calendar');
  });
});
