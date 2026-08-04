import React from 'react';
import { Bell, CheckCheck, Briefcase, CheckCircle2, MessageSquare, ShieldAlert, Layers } from 'lucide-react';

export type NotificationCategory = 'all' | 'unread' | 'job' | 'apply' | 'message' | 'system';

interface NotificationFilterPanelProps {
  activeCategory: NotificationCategory;
  setActiveCategory: (cat: NotificationCategory) => void;
  unreadCount: number;
  totalCount: number;
  handleMarkAllRead: () => void;
  t: any;
  counts: Record<NotificationCategory, number>;
}

export const NotificationFilterPanel: React.FC<NotificationFilterPanelProps> = ({
  activeCategory,
  setActiveCategory,
  unreadCount,
  handleMarkAllRead,
  t,
  counts
}) => {
  const categories: { id: NotificationCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.catAll || 'Barchasi', icon: <Layers size={15} /> },
    { id: 'unread', label: t.catUnread || "O'qilmaganlar", icon: <Bell size={15} /> },
    { id: 'job', label: t.catJob || "Ish takliflari", icon: <Briefcase size={15} /> },
    { id: 'apply', label: t.catApply || 'Arizalar', icon: <CheckCircle2 size={15} /> },
    { id: 'message', label: t.catMessage || 'Xabarlar', icon: <MessageSquare size={15} /> },
    { id: 'system', label: t.catSystem || 'Tizim va profil', icon: <ShieldAlert size={15} /> },
  ];

  return (
    <aside className="w-full flex flex-col gap-4">
      {/* Overview Stat Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-3xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Bell size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm text-slate-900">{t.title || 'Bildirishnomalar'}</h2>
              <p className="text-xs text-slate-400 font-medium">
                {unreadCount > 0 ? `${unreadCount} ta o'qilmagan` : 'Barchasi o\'qilgan'}
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="w-full mt-1 py-2.5 px-3 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-brand-primary/10 transition-all cursor-pointer outline-none active:scale-[0.98]"
          >
            <CheckCheck size={16} className="stroke-[2.5]" />
            <span>{t.markAllAsRead || "Hammasini o'qilgan qilish"}</span>
          </button>
        )}
      </div>

      {/* Category List Navigation */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-3xs flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1.5">
          {t.filterCategory || 'Kategoriyalar'}
        </span>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count = counts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none text-left ${
                isActive
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              {count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
