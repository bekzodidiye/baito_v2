import { NotificationItemData } from './NotificationItem';

export type NotificationKind = NotificationItemData['type'];

const KINDS: Record<string, NotificationKind> = {
  hired: 'apply',
  start_requested: 'apply',
  start_confirmed: 'apply',
  completed: 'apply',
  rejected: 'apply',
  apply: 'apply',

  job: 'job',
  jobs: 'job',

  chat: 'message',
  message: 'message',

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

  if (
    text.includes('ariza') ||
    text.includes('nomzod') ||
    text.includes('qabul qilindi') ||
    text.includes('tayinlandingiz') ||
    text.includes('отклик')
  ) {
    return 'apply';
  }

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

  if (
    text.includes("to'lov") ||
    text.includes('tolov') ||
    text.includes('hisob-faktura') ||
    text.includes('mablag') ||
    text.includes('оплат')
  ) {
    return 'payment';
  }

  if (
    text.includes('xabar') ||
    text.includes('chat') ||
    text.includes('сообщен')
  ) {
    return 'message';
  }

  return direct ?? 'system';
};

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
    case 'system':
    default:
      if (relatedJobId) {
        return isEmployer ? 'employer-jobs' : 'jobs';
      }
      return 'notifications';
  }
};
