import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, CheckCheck, CircleDot } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { NotificationFilterPanel, NotificationCategory } from './NotificationFilterPanel';
import { NotificationMobileChips } from './NotificationMobileChips';
import { getNotificationTranslations } from './Notifications.data';
import { useNotificationsData } from './useNotificationsData';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const NotificationsScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, setUnreadNotificationsCount } = useApp();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');

  const {
    notifications,
    filteredNotifications,
    handleMarkAllRead,
    counts,
    unreadCount
  } = useNotificationsData(activeCategory, setUnreadNotificationsCount);

  const t = getNotificationTranslations(language);

  const handleNotificationClick = (id: string) => {
    const item = notifications.find(n => n.id === id);
    if (!item) return;
    
    if (item.type === 'message') {
      setCurrentScreen('messages');
    } else if (item.type === 'job') {
      setCurrentScreen('jobs');
    } else if (item.type === 'apply') {
      setCurrentScreen('calendar');
    } else if (item.type === 'profile') {
      setCurrentScreen('profile');
    }
  };

  const todayNotifications = filteredNotifications.filter(n => n.group === 'today');
  const yesterdayNotifications = filteredNotifications.filter(n => n.group === 'yesterday');

  return (
    <div className="flex flex-col gap-5 pb-28 pt-3 md:pt-6 max-w-6xl mx-auto font-sans animate-fade-in w-full px-4">
      <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('calendar')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors active:scale-95 cursor-pointer border-0 bg-slate-50"
            title="Orqaga"
          >
            <ArrowLeft size={18} className="stroke-[2.2]" />
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>{t.title}</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-brand-primary text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 flex items-center gap-2 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary/10 bg-brand-primary/5 cursor-pointer transition-all active:scale-95 border-none"
          >
            <CheckCheck size={16} className="stroke-[2.5]" />
            <span className="hidden sm:inline">{t.markAllAsRead}</span>
          </button>
        )}
      </div>

      <NotificationMobileChips 
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        counts={counts}
        t={t}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="hidden md:block md:col-span-4 lg:col-span-4 sticky top-6">
          <NotificationFilterPanel
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            unreadCount={unreadCount}
            totalCount={notifications.length}
            handleMarkAllRead={handleMarkAllRead}
            t={t}
            counts={counts}
          />
        </div>

        <div className="md:col-span-8 lg:col-span-8 flex flex-col gap-4 w-full">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-3xs flex flex-col items-center justify-center text-center my-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                <CircleDot size={22} />
              </div>
              <p className="text-sm font-bold text-slate-600">{t.noNoti}</p>
            </div>
          ) : (
            <>
              {todayNotifications.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h2 className="text-xs font-extrabold tracking-wider text-slate-400 uppercase px-1">
                    {t.today}
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {todayNotifications.map((noti) => (
                      <NotificationItem 
                        key={noti.id}
                        noti={noti}
                        language={language}
                        handleNotificationClick={handleNotificationClick}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {yesterdayNotifications.length > 0 && (
                <div className="flex flex-col gap-2.5 mt-2">
                  <h2 className="text-xs font-extrabold tracking-wider text-slate-400 uppercase px-1">
                    {t.yesterday}
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {yesterdayNotifications.map((noti) => (
                      <NotificationItem 
                        key={noti.id}
                        noti={noti}
                        language={language}
                        handleNotificationClick={handleNotificationClick}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="py-4 text-center flex items-center justify-center gap-1.5 text-slate-400">
                <CheckCheck size={14} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                <p className="text-xs font-bold text-slate-400">
                  {t.allRead}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
