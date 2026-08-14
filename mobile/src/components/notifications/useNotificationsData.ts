import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotificationsApi, markAllNotificationsReadApi } from '../../api/queries';
import { NotificationItemData } from './NotificationItem';
import { NotificationCategory } from './NotificationFilterPanel';

export const useNotificationsData = (
  activeCategory: NotificationCategory,
  setUnreadNotificationsCount: (count: number) => void
) => {
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
    try {
      await markAllNotificationsReadApi();
    } catch (e) {}
    setUnreadNotificationsCount(0);
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
