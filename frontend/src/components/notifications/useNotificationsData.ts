import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationsApi, markAllNotificationsReadApi, markNotificationReadApi } from '../../api/queries';
import { showToast } from '../../utils/toast';
import { translateNotification } from '../../utils/notificationTranslator';
import { NotificationItemData } from './NotificationItem';
import { NotificationCategory } from './NotificationFilterPanel';
import { notificationKind } from './notificationKind';
import { useAuthStore } from "../../store/useAuthStore";

export const useNotificationsData = (
  activeCategory: NotificationCategory,
  setUnreadNotificationsCount: (count: number) => void
) => {
  const language = useAuthStore(s => s.language);
  const queryClient = useQueryClient();

  const { data: apiNotifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetchNotificationsApi();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
  });

  const notifications: NotificationItemData[] = useMemo(() => {
    if (!apiNotifs || apiNotifs.length === 0) return [];
    return apiNotifs.map((n: any) => {
      let timeStr = '10:00';
      let group: 'today' | 'yesterday' | 'earlier' = 'today';
      if (n.createdAt) {
        const d = new Date(n.createdAt);
        if (!isNaN(d.getTime())) {
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          timeStr = `${hours}:${minutes}`;

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const startOfYesterday = startOfToday - 86400000;
          const tTime = d.getTime();
          if (tTime >= startOfToday) {
            group = 'today';
          } else if (tTime >= startOfYesterday) {
            group = 'yesterday';
          } else {
            group = 'earlier';
          }
        }
      }

      return {
        id: n.id,
        titleUz: translateNotification(n.title, 'uz'),
        titleRu: translateNotification(n.title, 'ru'),
        titleEn: translateNotification(n.title, 'en'),
        descUz: translateNotification(n.message, 'uz'),
        descRu: translateNotification(n.message, 'ru'),
        descEn: translateNotification(n.message, 'en'),
        timeAgoUz: 'Hozirgina',
        timeAgoRu: 'Только что',
        timeAgoEn: 'Just now',
        timeUz: timeStr,
        timeRu: timeStr,
        timeEn: timeStr,
        isUnread: !n.isRead,
        type: notificationKind(n.type, n.title, n.message),
        group,
        relatedJobId: n.relatedJobId,
        rawType: n.type,
      };
    });
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
    } catch (e) {
      console.error('Could not mark notification as read', e);
    }
  };

  const handleMarkAllRead = async () => {
    // The counter used to be zeroed whether or not the request succeeded, and
    // the failure was swallowed. The badge cleared, the server still had them
    // unread, and they reappeared on the next refresh with no explanation.
    try {
      await markAllNotificationsReadApi();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
    system: notifications.filter(
      n => n.type === 'system' || n.type === 'profile'
        || n.type === 'payment' || n.type === 'support'
    ).length,
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'unread') return n.isUnread;
    if (activeCategory === 'job') return n.type === 'job';
    if (activeCategory === 'apply') return n.type === 'apply';
    if (activeCategory === 'message') return n.type === 'message';
    if (activeCategory === 'system') {
      return n.type === 'system' || n.type === 'profile'
        || n.type === 'payment' || n.type === 'support';
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
