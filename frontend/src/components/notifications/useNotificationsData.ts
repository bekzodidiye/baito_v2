import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotificationsApi, markAllNotificationsReadApi } from '../../api/queries';
import { useApp } from '../../context/AppContext';
import { showToast } from '../../utils/toast';
import { NotificationItemData } from './NotificationItem';
import { NotificationCategory } from './NotificationFilterPanel';

export const useNotificationsData = (
  activeCategory: NotificationCategory,
  setUnreadNotificationsCount: (count: number) => void
) => {
  const { language } = useApp();

  const { data: apiNotifs = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetchNotificationsApi();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
  });

  const notifications: NotificationItemData[] = useMemo(() => {
    if (!apiNotifs || apiNotifs.length === 0) return [];
    return apiNotifs.map((n: any) => ({
      id: n.id,
      titleUz: n.title,
      titleRu: n.title,
      titleEn: n.title,
      descUz: n.message,
      descRu: n.message,
      descEn: n.message,
      timeAgoUz: 'Hozirgina',
      timeAgoRu: 'Только что',
      timeAgoEn: 'Just now',
      timeUz: '10:00',
      timeRu: '10:00',
      timeEn: '10:00',
      isUnread: !n.isRead,
      type: n.type === 'start_request' ? 'job' : n.type === 'apply' ? 'apply' : 'system',
      group: 'today',
    }));
  }, [apiNotifs]);

  const handleMarkAllRead = async () => {
    // The counter used to be zeroed whether or not the request succeeded, and
    // the failure was swallowed. The badge cleared, the server still had them
    // unread, and they reappeared on the next refresh with no explanation.
    try {
      await markAllNotificationsReadApi();
      setUnreadNotificationsCount(0);
    } catch (e) {
      console.error('Could not mark notifications as read', e);
      showToast(
        language === 'uz'
          ? "Bildirishnomalarni o'qilgan deb belgilab bo'lmadi. Qaytadan urinib ko'ring."
          : language === 'ru'
            ? 'Не удалось отметить уведомления прочитанными. Попробуйте ещё раз.'
            : 'Could not mark notifications as read. Please try again.'
      );
    }
  };

  const counts: Record<NotificationCategory, number> = {
    all: notifications.length,
    unread: notifications.filter(n => n.isUnread).length,
    job: notifications.filter(n => n.type === 'job').length,
    apply: notifications.filter(n => n.type === 'apply').length,
    message: notifications.filter(n => n.type === 'message').length,
    system: notifications.filter(n => n.type === 'system' || n.type === 'profile').length,
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'unread') return n.isUnread;
    if (activeCategory === 'job') return n.type === 'job';
    if (activeCategory === 'apply') return n.type === 'apply';
    if (activeCategory === 'message') return n.type === 'message';
    if (activeCategory === 'system') return n.type === 'system' || n.type === 'profile';
    return true;
  });

  return {
    notifications,
    filteredNotifications,
    handleMarkAllRead,
    counts,
    unreadCount: counts.unread
  };
};
