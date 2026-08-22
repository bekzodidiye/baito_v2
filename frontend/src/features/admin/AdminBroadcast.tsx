import React, { useState } from 'react';
import { Send, Bell, Users, CheckCircle2 } from 'lucide-react';

interface AdminBroadcastProps {
  onSendBroadcast: (title: string, message: string, targetRole: string) => void;
}

export const AdminBroadcast: React.FC<AdminBroadcastProps> = ({ onSendBroadcast }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
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
          <Send size={20} className="text-blue-600" />
          <span>Ommaviy Xabarnoma Yuborish (System Broadcast)</span>
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
                      ? 'bg-slate-900 text-white border-slate-900'
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
              type="text"
              placeholder="Masalan: Tizimda yangilanishlar e'lon qilindi!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Xabar matni</label>
            <textarea
              rows={4}
              placeholder="Foydalanuvchilarga ko'rinadigan to'liq bildirishnoma matnini yozing..."
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
                <span>Yuborildi!</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Xabarnomani Yuborish</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
