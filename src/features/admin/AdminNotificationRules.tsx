import React, { useState } from 'react';
import { NotificationTemplate } from './types';
import { BellRing, Plus, Edit2, CheckCircle, MessageSquare, Smartphone, Zap, ToggleLeft, ToggleRight } from 'lucide-react';

const INITIAL_RULES: NotificationTemplate[] = [
  {
    id: 'notif-1',
    title: 'Hujjat Tasdiqlandi (Verification Success)',
    eventTrigger: 'verification_approved',
    channel: 'both',
    bodyTemplate: 'Tabriklaymiz, {user_name}! Hujjatlaringiz muvaffaqiyatli tasdiqlandi. Endi e\'lonlarga ariza topshirishingiz mumkin.',
    isActive: true,
  },
  {
    id: 'notif-2',
    title: 'Hujjat Rad Etildi (Verification Rejected)',
    eventTrigger: 'verification_rejected',
    channel: 'both',
    bodyTemplate: 'Hurmatli {user_name}, hujjatlaringiz rad etildi. Sabab: {reason}. Qayta yuklash uchun profilingizga o\'ting.',
    isActive: true,
  },
  {
    id: 'notif-3',
    title: 'Yangi Ish E\'loni Yaratildi',
    eventTrigger: 'job_created',
    channel: 'push',
    bodyTemplate: 'Sizning hududingizda yangi ish joylandi: "{job_title}". Darhol ko\'rib chiqing!',
    isActive: true,
  },
  {
    id: 'notif-4',
    title: 'Nofaollik bo\'yicha Eslatma (7 kun kirmaganlar)',
    eventTrigger: 'inactive_reminder',
    channel: 'sms',
    bodyTemplate: '{user_name}, Baito ilovasida siz uchun 15+ yangi ish takliflari bor! Darhol ilovani oching.',
    isActive: false,
  },
];

export const AdminNotificationRules: React.FC = () => {
  const [rules, setRules] = useState<NotificationTemplate[]>(INITIAL_RULES);

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BellRing className="text-amber-500" size={24} />
            Avto-Xabarnoma Qoidalari va Shablonlar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tizim hodisalari va triggerlari bo'yicha avtomatik SMS va Push bildirishnomalar
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{rule.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      Trigger: {rule.eventTrigger}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      Kanal: {rule.channel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleRule(rule.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  rule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {rule.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {rule.isActive ? 'FAOL' : 'NOFAOL'}
              </button>
            </div>

            {/* Template Body */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-mono">
              {rule.bodyTemplate}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
