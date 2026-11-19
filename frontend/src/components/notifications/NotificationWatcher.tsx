import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { fetchNotificationsApi } from '../../api/queries';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { chime } from '../../utils/chime';
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * Announces a notification the moment it arrives.
 *
 * Before this, notifications were fetched only by NotificationsScreen — so
 * nothing watched for them anywhere else in the app. The unread badge in the
 * header only moved while that one screen was open, and a notification that
 * arrived while a worker was looking at anything else made no sound, showed
 * no banner and did not change the badge. It was findable only by opening the
 * list and noticing something new.
 *
 * Mounted once, at the app root, for the whole session.
 */

/** One array, reused. A `[]` written inline as useQuery's default is a fresh
 *  identity on every render, which re-fires the effect below on every render —
 *  and the effect writes to the store, which re-renders the provider, which
 *  renders this again. Logged out, that was an infinite loop that took the
 *  whole app down, landing page included. */
const NONE: any[] = [];
export const NotificationWatcher: React.FC = () => {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const setUnreadNotificationsCount = useUIStore(s => s.setUnreadNotificationsCount);
    const language = useAuthStore(s => s.language);
  const { setCurrentScreen } = useCurrentScreen();
  const [banner, setBanner] = React.useState<{ id: string; title: string; message: string } | null>(null);

  // Ids already accounted for. Seeded on the first successful fetch so a page
  // load does not replay every unread notification the account has.
  const seen = useRef<Set<string> | null>(null);
  const hideAt = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isSuccess } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetchNotificationsApi();
      return Array.isArray(res) ? res : [];
    },
    enabled: isLoggedIn,
    refetchInterval: 45000,
    refetchOnWindowFocus: false,
  });

  const items = data ?? NONE;

  useEffect(() => {
    if (!isLoggedIn) {
      // Only when there was a session to clear. Writing 0 on every render of
      // every logged-out visit is both pointless and, through the store, a
      // re-render that brings us straight back here.
      if (seen.current !== null) {
        seen.current = null;
        setUnreadNotificationsCount(0);
      }
      return;
    }
    // useQuery hands back the [] default before the first request resolves.
    // Seeding from that would mark nothing as seen, and then every existing
    // notification would look new the moment the real list arrived.
    if (!isSuccess) return;

    setUnreadNotificationsCount(items.filter((n: any) => !n.isRead).length);

    if (seen.current === null) {
      seen.current = new Set(items.map((n: any) => String(n.id)));
      return;
    }

    const fresh = items.filter(
      (n: any) => !n.isRead && !seen.current!.has(String(n.id)),
    );
    items.forEach((n: any) => seen.current!.add(String(n.id)));
    if (fresh.length === 0) return;

    const newest = fresh[0];
    setBanner({
      id: String(newest.id),
      title: newest.title || (language === 'ru' ? 'Уведомление' : language === 'en' ? 'Notification' : 'Bildirishnoma'),
      message: fresh.length > 1
        ? (language === 'ru' ? `и ещё ${fresh.length - 1}` : language === 'en' ? `and ${fresh.length - 1} more` : `va yana ${fresh.length - 1} ta`)
        : (newest.message || ''),
    });
    chime();

    if (hideAt.current) clearTimeout(hideAt.current);
    hideAt.current = setTimeout(() => setBanner(null), 6000);
  }, [items, isSuccess, isLoggedIn, language, setUnreadNotificationsCount]);

  useEffect(() => () => { if (hideAt.current) clearTimeout(hideAt.current); }, []);

  const open = () => {
    setBanner(null);
    setCurrentScreen('notifications');
  };

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.22 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99998] w-[92%] max-w-md"
        >
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
          >
            <button
              onClick={open}
              className="flex items-start gap-3 flex-1 text-left cursor-pointer"
            >
              <span className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Bell size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-slate-900 truncate">
                  {banner.title}
                </span>
                {banner.message && (
                  <span className="block text-[12px] text-slate-500 line-clamp-2">
                    {banner.message}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setBanner(null)}
              aria-label={language === 'ru' ? 'Закрыть' : language === 'en' ? 'Dismiss' : 'Yopish'}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
