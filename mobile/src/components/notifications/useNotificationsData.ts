import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationsApi, markAllNotificationsReadApi, markNotificationReadApi } from '../../api/queries';
import { NotificationItemData } from './NotificationItem';
import { NotificationCategory } from './NotificationFilterPanel';
import { notificationKind } from './notificationKind';

export const useNotificationsData = (
  activeCategory: NotificationCategory,
  setUnreadNotificationsCount: (count: number) => void
) => {
  const queryClient = useQueryClient();

  const { data: apiNotifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetchNotificationsApi();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    retry: 2,
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
      type: notificationKind(n.type, n.title, n.message),
      group: 'today',
      relatedJobId: n.relatedJobId,
      rawType: n.type,
    }));
  }, [apiNotifs]);

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      queryClient.setQueryData(['notifications'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((item: any) => item.id === id ? { ...item, isRead: true } : item);
      });
      setUnreadNotificationsCount(Math.max(0, counts.unread - 1));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Ignore
    }
    setUnreadNotificationsCount(0);
  };

  const counts: Record<NotificationCategory, number> = {
    all: notifications.length,
    unread: notifications.filter(n => n.isUnread).length,
    job: notifications.filter(n => n.type === 'job').length,
    apply: notifications.filter(n => n.type === 'apply').length,
    message: notifications.filter(n => n.type === 'message').length,
    system: notifications.filter(
      n => n.type === 'system' || n.type === 'profile' || n.type === 'payment' || n.type === 'support'
    ).length,
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'unread') return n.isUnread;
    if (activeCategory === 'job') return n.type === 'job';
    if (activeCategory === 'apply') return n.type === 'apply';
    if (activeCategory === 'message') return n.type === 'message';
    if (activeCategory === 'system') {
      return n.type === 'system' || n.type === 'profile' || n.type === 'payment' || n.type === 'support';
    }
    return true;
  });

  return {
    notifications,
    filteredNotifications,
    handleMarkAllRead,
    handleMarkOneRead,
    counts,
    unreadCount: counts.unread
  };
};
