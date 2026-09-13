import { NotificationItemData } from './NotificationItem';

export type NotificationKind = NotificationItemData['type'];

/**
 * The backend's notification `type` is written at each call site and there are
 * a dozen of them: hired, start_requested, start_confirmed, rejected,
 * transaction, payout, deposit, withdraw, ticket, user, settings, job, system.
 *
 * The screen understood two — and one of those was misspelled ("start_request"
 * against the "start_requested" actually sent) — so everything fell through to
 * `system`. Every row in the list showed the same icon, and clicking one did
 * nothing, because the click handler only knew what to do with the types that
 * never matched.
 */
const KINDS: Record<string, NotificationKind> = {
  // Work the person is committed to.
  hired: 'apply',
  start_requested: 'apply',
  start_confirmed: 'apply',
  completed: 'apply',
  rejected: 'apply',
  apply: 'apply',

  // Postings and shifts.
  job: 'job',
  jobs: 'job',

  chat: 'message',
  message: 'message',

  // Money.
  transaction: 'payment',
  payout: 'payment',
  deposit: 'payment',
  withdraw: 'payment',

  ticket: 'support',
  support: 'support',

  user: 'profile',
  users: 'profile',
  profile: 'profile',
  settings: 'profile',

  system: 'system',
};

export const notificationKind = (backendType?: string | null): NotificationKind =>
  KINDS[(backendType || '').toLowerCase()] ?? 'system';

/** Where "Tafsilotlarni ko'rish" should take the reader. */
export const notificationDestination = (kind: NotificationKind): string => {
  switch (kind) {
    case 'message': return 'messages';
    case 'job': return 'jobs';
    case 'apply': return 'calendar';
    case 'payment': return 'payments';
    case 'support': return 'support';
    case 'profile': return 'profile';
    // Nothing specific to open: the notification says all there is to say.
    default: return 'notifications';
  }
};
