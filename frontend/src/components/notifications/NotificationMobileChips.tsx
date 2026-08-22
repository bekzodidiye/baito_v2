import React from 'react';
import { Layers, Bell, Briefcase, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';
import { NotificationCategory } from './NotificationFilterPanel';

interface NotificationMobileChipsProps {
  activeCategory: NotificationCategory;
  setActiveCategory: (cat: NotificationCategory) => void;
  counts: Record<NotificationCategory, number>;
  t: any;
}

export const NotificationMobileChips: React.FC<NotificationMobileChipsProps> = ({
  activeCategory,
  setActiveCategory,
  counts,
  t
}) => {
  const mobileChips: { id: NotificationCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.catAll, icon: <Layers size={13} /> },
    { id: 'unread', label: t.catUnread, icon: <Bell size={13} /> },
    { id: 'job', label: t.catJob, icon: <Briefcase size={13} /> },
    { id: 'apply', label: t.catApply, icon: <CheckCircle2 size={13} /> },
    { id: 'message', label: t.catMessage, icon: <MessageSquare size={13} /> },
    { id: 'system', label: t.catSystem, icon: <ShieldAlert size={13} /> },
  ];

  return (
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
  );
};
