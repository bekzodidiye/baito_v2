import React from 'react';
import { Briefcase, CheckCircle2, MessageSquare, AlertCircle, Sparkles, ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';

export interface NotificationItemData {
  id: string;
  type: 'job' | 'apply' | 'message' | 'profile' | 'system';
  titleUz: string;
  titleRu: string;
  titleEn: string;
  descUz: string;
  descRu: string;
  descEn: string;
  timeUz: string;
  timeRu: string;
  timeEn: string;
  isUnread: boolean;
  group: 'today' | 'yesterday';
}

interface NotificationItemProps {
  noti: NotificationItemData;
  language: 'uz' | 'ru' | 'en';
  handleNotificationClick: (id: string) => void;
  t: any;
}

const getIcon = (type: NotificationItemData['type']) => {
  switch (type) {
    case 'job':
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-brand-primary border border-indigo-100/50">
          <Briefcase size={16} className="stroke-[2.2]" />
        </div>
      );
    case 'apply':
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600 border border-emerald-100/50">
          <CheckCircle2 size={16} className="stroke-[2.2]" />
        </div>
      );
    case 'message':
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 border border-blue-100/50">
          <MessageSquare size={16} className="stroke-[2.2]" />
        </div>
      );
    case 'profile':
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 border border-amber-100/50">
          <AlertCircle size={16} className="stroke-[2.2]" />
        </div>
      );
    case 'system':
    default:
      return (
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 border border-slate-200/50">
          <Sparkles size={16} className="stroke-[2.2]" />
        </div>
      );
  }
};

const getTypeBadge = (type: NotificationItemData['type'], t: any) => {
  switch (type) {
    case 'job':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">{t.badgeJob || 'Ish'}</span>;
    case 'apply':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">{t.badgeApply || 'Ariza'}</span>;
    case 'message':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">{t.badgeMessage || 'Xabar'}</span>;
    case 'profile':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">{t.badgeProfile || 'Profil'}</span>;
    case 'system':
    default:
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{t.badgeSystem || 'Tizim'}</span>;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  noti,
  language,
  handleNotificationClick,
  t
}) => {
  const title = language === 'uz' ? noti.titleUz : language === 'ru' ? noti.titleRu : noti.titleEn;
  const desc = language === 'uz' ? noti.descUz : language === 'ru' ? noti.descRu : noti.descEn;
  const time = language === 'uz' ? noti.timeUz : language === 'ru' ? noti.timeRu : noti.timeEn;

  return (
    <motion.article
      onClick={() => handleNotificationClick(noti.id)}
      whileHover={{ y: -1 }}
      className={`p-4 rounded-2xl transition-all duration-200 flex gap-3.5 items-start relative cursor-pointer select-none group border ${
        noti.isUnread 
          ? 'bg-white border-brand-primary/15 shadow-2xs hover:shadow-xs hover:border-brand-primary/30' 
          : 'bg-white/70 hover:bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* Type Icon */}
      {getIcon(noti.type)}

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {noti.isUnread && (
              <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0 animate-pulse" />
            )}
            <h3 className={`text-xs font-bold leading-tight truncate ${noti.isUnread ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
              {title}
            </h3>
            {getTypeBadge(noti.type, t)}
          </div>
          
          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
            {time}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-500 font-medium">
          {desc}
        </p>

        {/* Action button hint on desktop hover */}
        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-brand-primary opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <span>{noti.type === 'message' ? (t.openChat || "Chatga o'tish") : (t.viewDetails || "Tafsilotlarni ko'rish")}</span>
          <ArrowRight size={13} className="stroke-[2.5]" />
        </div>
      </div>

      {/* Read indicator mark icon */}
      {!noti.isUnread && (
        <div className="absolute top-4 right-3 text-slate-300 group-hover:text-slate-400">
          <Check size={14} className="stroke-[2]" />
        </div>
      )}
    </motion.article>
  );
};
