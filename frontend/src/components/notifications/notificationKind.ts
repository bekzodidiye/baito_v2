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

export const notificationKind = (
  backendType?: string | null,
  title?: string | null,
  message?: string | null,
): NotificationKind => {
  const direct = KINDS[(backendType || '').toLowerCase()];
  if (direct && direct !== 'system') {
    return direct;
  }

  const text = `${title || ''} ${message || ''}`.toLowerCase();

  // Support tickets & responses
  if (
    text.includes('murojaat') ||
    text.includes("qo'llab-quvvatlash") ||
    text.includes('qollab-quvvatlash') ||
    text.includes('yordam') ||
    text.includes('support') ||
    text.includes('ticket') ||
    text.includes('поддержк')
  ) {
    return 'support';
  }

  // Applications & hiring
  if (
    text.includes('ariza') ||
    text.includes('nomzod') ||
    text.includes('qabul qilindi') ||
    text.includes('tayinlandingiz') ||
    text.includes('отклик')
  ) {
    return 'apply';
  }

  // Jobs / postings
  if (
    text.includes("e'lon") ||
    text.includes('elon') ||
    text.includes('ish ') ||
    text.includes('smena') ||
    text.includes('ваканси') ||
    text.includes('объявлен')
  ) {
    return 'job';
  }

  // Payments / invoices / wallet
  if (
    text.includes("to'lov") ||
    text.includes('tolov') ||
    text.includes('hisob-faktura') ||
    text.includes('mablag') ||
    text.includes('оплат')
  ) {
    return 'payment';
  }

  // Messages / chats
  if (
    text.includes('xabar') ||
    text.includes('chat') ||
    text.includes('сообщен')
  ) {
    return 'message';
  }

  return direct ?? 'system';
};

/** Where "Tafsilotlarni ko'rish" should take the reader based on kind and user role. */
export const notificationDestination = (
  kind: NotificationKind,
  role?: string | null,
  relatedJobId?: string | null,
): string => {
  const isEmployer = role === 'employer';

  switch (kind) {
    case 'message':
      return isEmployer ? 'employer-chats' : 'messages';
    case 'job':
      return isEmployer ? 'employer-jobs' : 'jobs';
    case 'apply':
      return isEmployer ? 'employer-applicants' : 'calendar';
    case 'payment':
      return 'payments';
    case 'support':
      return 'support-chat';
    case 'profile':
      return isEmployer ? 'employer-profile' : 'profile';
    // If it has a related job, navigate to jobs list; otherwise stay put.
    case 'system':
    default:
      if (relatedJobId) {
        return isEmployer ? 'employer-jobs' : 'jobs';
      }
      return 'notifications';
  }
};
