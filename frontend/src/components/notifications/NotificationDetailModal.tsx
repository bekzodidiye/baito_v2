import React from 'react';
import { X, Bell, Briefcase, CheckCircle2, MessageCircle, Wallet, LifeBuoy, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationItemData } from './NotificationItem';
import { useFocusTrap } from '../common/useFocusTrap';

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: NotificationItemData | null;
  language: 'uz' | 'ru' | 'en';
  onActionClick?: () => void;
  actionLabel?: string | null;
}

const getModalIcon = (type?: NotificationItemData['type']) => {
  switch (type) {
    case 'job':
      return (
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
          <Briefcase size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'apply':
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <CheckCircle2 size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'message':
      return (
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20">
          <MessageCircle size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'payment':
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <Wallet size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'support':
      return (
        <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
          <LifeBuoy size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'profile':
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
          <AlertCircle size={22} className="stroke-[2.2]" />
        </div>
      );
    case 'system':
    default:
      return (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
          <Bell size={22} className="stroke-[2.2]" />
        </div>
      );
  }
};

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  isOpen,
  onClose,
  notification,
  language,
  onActionClick,
  actionLabel,
}) => {
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen || !notification) return null;

  const title =
    language === 'uz' ? notification.titleUz : language === 'ru' ? notification.titleRu : notification.titleEn;
  const desc =
    language === 'uz' ? notification.descUz : language === 'ru' ? notification.descRu : notification.descEn;
  const time =
    language === 'uz' ? notification.timeUz : language === 'ru' ? notification.timeRu : notification.timeEn;

  const closeText = language === 'ru' ? 'Закрыть' : language === 'en' ? 'Close' : 'Yopish';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal content */}
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 z-10 flex flex-col gap-5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {getModalIcon(notification.type)}
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 tracking-tight leading-snug">
                  {title}
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {time}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeText}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors border-0 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description Body */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 text-sm text-slate-700 font-medium leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
            {desc}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border-0 cursor-pointer active:scale-95"
            >
              {closeText}
            </button>

            {onActionClick && actionLabel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onActionClick();
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer active:scale-95"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
