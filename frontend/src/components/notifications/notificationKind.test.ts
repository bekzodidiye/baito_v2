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
  it('sends each kind somewhere useful for worker', () => {
    expect(notificationDestination('message', 'worker')).toBe('messages');
    expect(notificationDestination('job', 'worker')).toBe('jobs');
    expect(notificationDestination('apply', 'worker')).toBe('calendar');
    expect(notificationDestination('payment', 'worker')).toBe('payments');
    expect(notificationDestination('support', 'worker')).toBe('support-chat');
    expect(notificationDestination('profile', 'worker')).toBe('profile');
  });

  it('routes correctly for employer to employer screens', () => {
    expect(notificationDestination('message', 'employer')).toBe('employer-chats');
    expect(notificationDestination('job', 'employer')).toBe('employer-jobs');
    expect(notificationDestination('apply', 'employer')).toBe('employer-applicants');
    expect(notificationDestination('payment', 'employer')).toBe('payments');
    expect(notificationDestination('support', 'employer')).toBe('support-chat');
    expect(notificationDestination('profile', 'employer')).toBe('employer-profile');
  });

  it('routes system notification with relatedJobId to jobs screen', () => {
    expect(notificationDestination('system', 'employer', 'job-123')).toBe('employer-jobs');
    expect(notificationDestination('system', 'worker', 'job-123')).toBe('jobs');
  });

  it('stays put for a plain system message without relatedJobId', () => {
    // Nothing to open — the notification is the whole content.
    expect(notificationDestination('system')).toBe('notifications');
  });

  it('gives a real destination to a hired notification', () => {
    // The end-to-end case from the report: a worker is told they were
    // assigned, taps "see details", and should land on their calendar.
    expect(notificationDestination(notificationKind('hired'), 'worker')).toBe('calendar');
  });

  it('infers kind from title and message if type was system or omitted', () => {
    expect(
      notificationKind('system', 'Murojaatingizga javob', "'Yordam markazi' bo'yicha qo'llab-quvvatlash javob berdi.")
    ).toBe('support');
    expect(
      notificationKind('system', "E'loningiz tasdiqlandi", "E'lon tasdiqlandi")
    ).toBe('job');
    expect(
      notificationKind('system', 'Yangi ariza keldi', "Ishchi ariza topshirdi")
    ).toBe('apply');
    expect(
      notificationKind('system', 'To\'lov tasdiqlandi', "100 000 so'm to'lov o'tkazildi")
    ).toBe('payment');
  });
});
