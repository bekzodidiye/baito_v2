import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, Check } from 'lucide-react';
import { useFocusTrap } from '../common/useFocusTrap';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language?: 'uz' | 'ru' | 'en';
  isOwnMessage?: boolean;
  participantName?: string;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  language = 'uz',
  isOwnMessage = true,
  participantName,
}) => {
  const [deleteForAll, setDeleteForAll] = useState(true);
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = {
    title:
      language === 'uz'
        ? "Xabarni o'chirish"
        : language === 'ru'
          ? 'Удалить сообщение'
          : 'Delete message',
    message:
      language === 'uz'
        ? "Haqiqatan ham bu xabarni o'chirmoqchimisiz?"
        : language === 'ru'
          ? 'Вы уверены, что хотите удалить это сообщение?'
          : 'Are you sure you want to delete this message?',
    deleteForAll:
      language === 'uz'
        ? participantName
          ? `${participantName} uchun ham o'chirish`
          : "Barcha uchun o'chirish"
        : language === 'ru'
          ? participantName
            ? `Удалить также для ${participantName}`
            : 'Удалить для всех'
          : participantName
            ? `Also delete for ${participantName}`
            : 'Delete for everyone',
    cancel: language === 'uz' ? 'Bekor qilish' : language === 'ru' ? 'Отмена' : 'Cancel',
    delete: language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title & Icon */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
            <Trash2 size={20} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{t.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>
          </div>
        </div>

        {/* Telegram Checkbox for deleting for both */}
        {isOwnMessage && (
          <label className="flex items-center gap-3 py-3 px-3 mt-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={deleteForAll}
              onChange={(e) => setDeleteForAll(e.target.checked)}
            />
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                deleteForAll
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-white border-2 border-slate-300'
              }`}
            >
              {deleteForAll && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            </div>
            <span className="text-xs font-semibold text-slate-700 flex-1 truncate">
              {t.deleteForAll}
            </span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>{t.delete}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
