import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle, AlertTriangle } from 'lucide-react';
import { SystemSettings } from './types';

/**
 * Notification wording.
 *
 * This screen used to list four templates in a local array with toggles that
 * flipped a boolean in React state. Editing one changed nothing: the wording
 * that actually goes out was a literal in the backend, and two of the four
 * described events nothing in the system sends.
 *
 * The two that correspond to a real event are stored and used. The other two
 * are still listed, because the intent behind them is worth keeping visible,
 * but they say plainly that nothing sends them yet rather than offering a
 * switch that does nothing.
 */

interface AdminNotificationRulesProps {
  settings: SystemSettings;
  onUpdateSettings: (cfg: Partial<SystemSettings>) => Promise<unknown> | void;
}

const DEFAULT_VERIFIED =
  "Tabriklaymiz, {user_name}! Hujjatlaringiz muvaffaqiyatli tasdiqlandi.";
const DEFAULT_REJECTED =
  "Hurmatli {user_name}, hujjatlaringiz rad etildi. Qayta yuklash uchun profilingizga o'ting.";

const NOT_WIRED = [
  {
    title: "Yangi ish e'loni (hududingizda)",
    why: "Bunday xabarnoma yuboradigan kod hozircha yo'q.",
  },
  {
    title: 'Nofaollik eslatmasi (7 kun kirmaganlar)',
    why: "Rejalashtirilgan vazifa yozilmagan.",
  },
];

export const AdminNotificationRules: React.FC<AdminNotificationRulesProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [verified, setVerified] = useState(settings.notifVerifiedTemplate ?? DEFAULT_VERIFIED);
  const [rejected, setRejected] = useState(settings.notifRejectedTemplate ?? DEFAULT_REJECTED);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVerified(settings.notifVerifiedTemplate ?? DEFAULT_VERIFIED);
    setRejected(settings.notifRejectedTemplate ?? DEFAULT_REJECTED);
  }, [settings.notifVerifiedTemplate, settings.notifRejectedTemplate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateSettings({
        notifVerifiedTemplate: verified.trim() || DEFAULT_VERIFIED,
        notifRejectedTemplate: rejected.trim() || DEFAULT_REJECTED,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <BellRing size={20} className="text-blue-600" />
          <span>Avtomatik Xabarnoma Matnlari</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Foydalanuvchiga yuboriladigan matnlar. <code>{'{user_name}'}</code> foydalanuvchi ismiga almashadi.
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
          <CheckCircle size={15} /> Ishlaydigan xabarnomalar
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notif-verified" className="font-bold text-slate-700 block">
            Hujjatlar tasdiqlanganda
          </label>
          <textarea
            id="notif-verified"
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notif-rejected" className="font-bold text-slate-700 block">
            Hujjatlar rad etilganda
          </label>
          <textarea
            id="notif-rejected"
            value={rejected}
            onChange={(e) => setRejected(e.target.value)}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500 font-medium">
            Hujjatlarni tasdiqlash bo'limida qo'llanadi.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-amber-700 font-extrabold">
          <AlertTriangle size={15} /> Hali ulanmagan
        </div>
        {NOT_WIRED.map((r) => (
          <div key={r.title} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="font-bold text-slate-800">{r.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{r.why}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
