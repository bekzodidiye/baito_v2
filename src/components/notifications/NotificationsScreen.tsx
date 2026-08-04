import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, CheckCheck, CircleDot, Layers, Bell, Briefcase, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';
import { NotificationItem, NotificationItemData } from './NotificationItem';
import { NotificationFilterPanel, NotificationCategory } from './NotificationFilterPanel';
import { INITIAL_NOTIFICATIONS, getNotificationTranslations } from './Notifications.data';

export const NotificationsScreen: React.FC = () => {
  const { language, setCurrentScreen, setUnreadNotificationsCount } = useApp();
  const [notifications, setNotifications] = useState<NotificationItemData[]>(INITIAL_NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');

  const t = getNotificationTranslations(language);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    setUnreadNotificationsCount(0);
  };

  const handleNotificationClick = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isUnread: false } : n);
    setNotifications(updated);
    
    const unreadCount = updated.filter(n => n.isUnread).length;
    setUnreadNotificationsCount(unreadCount);

    const item = notifications.find(n => n.id === id);
    if (item?.type === 'message') {
      setCurrentScreen('xabarlar');
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

  const todayNotifications = filteredNotifications.filter(n => n.group === 'today');
  const yesterdayNotifications = filteredNotifications.filter(n => n.group === 'yesterday');
  const unreadCount = counts.unread;

  const mobileChips: { id: NotificationCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.catAll, icon: <Layers size={13} /> },
    { id: 'unread', label: t.catUnread, icon: <Bell size={13} /> },
    { id: 'job', label: t.catJob, icon: <Briefcase size={13} /> },
    { id: 'apply', label: t.catApply, icon: <CheckCircle2 size={13} /> },
    { id: 'message', label: t.catMessage, icon: <MessageSquare size={13} /> },
    { id: 'system', label: t.catSystem, icon: <ShieldAlert size={13} /> },
  ];

  return (
    <div className="flex flex-col gap-5 pb-20 pt-3 md:pt-6 max-w-6xl mx-auto font-sans animate-fade-in w-full px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('kalendar')}
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

      {/* Mobile Horizontal Filter Chips */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {mobileChips.map((chip) => {
          const isActive = activeCategory === chip.id;
          const count = counts[chip.id] || 0;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveCategory(chip.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border-none ${
                isActive ? 'bg-brand-primary text-white shadow-3xs' : 'bg-white text-slate-600 border border-slate-200/80'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Desktop Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Filter Sidebar (Desktop) */}
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

        {/* Right Notification List Panel */}
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
