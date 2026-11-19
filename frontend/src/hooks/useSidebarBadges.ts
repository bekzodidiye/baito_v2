import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

/** The counts a menu item carries, so a person can see something arrived.
 *
 *  Only Notifications had a badge. An application landing on an employer's
 *  desk, or a message waiting in a chat, showed nothing at all — the only way
 *  to find out was to open the screen and look.
 *
 *  Both numbers are already on the wire: `/applications/employer` carries the
 *  status of every application, and `/chats` carries `unreadCount` per
 *  conversation. Nothing new is fetched for the sake of a badge.
 */
export const useSidebarBadges = () => {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const role = useAuthStore(s => s.userProfile?.selectedRole);
  const isEmployer = role === 'employer';

  const { data: pendingApplications = 0 } = useQuery({
    queryKey: ['badge', 'applications'],
    enabled: isLoggedIn && isEmployer,
    // Same interval the notification badge polls on: often enough to notice,
    // rare enough not to chatter.
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows = await apiClient('/applications/employer');
      if (!Array.isArray(rows)) return 0;
      return rows.filter((a: { status?: string }) => a.status === 'applied').length;
    },
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['badge', 'chats'],
    enabled: isLoggedIn,
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows = await apiClient('/chats/');
      const list = Array.isArray(rows) ? rows : (rows?.items ?? []);
      return list.reduce(
        (total: number, c: { unreadCount?: number }) => total + (Number(c.unreadCount) || 0),
        0,
      );
    },
  });

  return { pendingApplications, unreadMessages };
};
