import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { Send, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface AdminBroadcastProps {
  onSendBroadcast: (title: string, message: string, targetRole: string) => void;
}

export const AdminBroadcast: React.FC<AdminBroadcastProps> = ({ onSendBroadcast }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [sent, setSent] = useState(false);
  // A broadcast reaches every user on the platform at once and cannot be
  // recalled. It used to go out on the first press.
  const [confirming, setConfirming] = useState(false);

  const audience = targetRole === 'worker'
    ? 'barcha ishchilarga'
    : targetRole === 'employer'
      ? 'barcha ish beruvchilarga'
      : 'platformadagi BARCHA foydalanuvchilarga';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setConfirming(true);
  };

  const send = () => {
    onSendBroadcast(title, message, targetRole);
    setSent(true);
    setTimeout(() => {
      setTitle('');
      setMessage('');
      setSent(false);
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Send size={20} className="text-brand-primary" />
          <span>{a.broadcastTitle}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Platformadagi foydalanuvchilar ekraniga bildirishnoma yoki muhim xabar yuborish
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Kimga yuborilsin?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Barchaga' },
                { id: 'worker', label: 'Ishchilarga' },
                { id: 'employer', label: 'Ish beruvchilarga' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetRole(t.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    targetRole === t.id
                      ? 'bg-brand-primary text-white border-brand-primary shadow-xs shadow-brand-primary/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Sarlavha (Title)</label>
            <input
              aria-label="Sarlavha (Title)"
              type="text"
              placeholder={a.broadcastTitleExample}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">{a.broadcastBodyLabel}</label>
            <textarea
              rows={4}
              placeholder={a.broadcastBodyPlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sent}
            className="w-full py-3 bg-brand-primary text-white font-extrabold text-xs rounded-xl hover:bg-brand-primary/95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {sent ? (
              <>
                <CheckCircle2 size={16} />
                <span>{a.sentExclaim}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{a.sendBroadcast}</span>
              </>
            )}
          </button>
        </form>
      </div>

      <ConfirmModal
        isOpen={confirming}
        title="Xabarnomani yuborasizmi?"
        message={`«${title}» ${audience} yuboriladi. Yuborilgan xabarnomani qaytarib bo'lmaydi.`}
        confirmText="Yuborish"
        cancelText="Bekor qilish"
        isDestructive={false}
        onConfirm={send}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
};
