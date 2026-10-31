import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { SystemSettings } from './types';
import { 
  Sliders, Save, CheckCircle2, ShieldAlert, ToggleLeft, ToggleRight, 
  Plus, X, Percent, Banknote, Shield, Clock, Trash2, UserCheck, ShieldCheck
} from 'lucide-react';

interface AdminSettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newCfg: Partial<SystemSettings>) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [activeTab, setActiveTab] = useState<'general' | 'admins' | 'logs'>('general');
  const [fee, setFee] = useState(settings.platformFeePercent.toString());
  const [minRate, setMinRate] = useState(settings.minHourlyRate.toString());
  const [maint, setMaint] = useState(settings.maintenanceMode);
  const [autoApprove, setAutoApprove] = useState(settings.autoApproveJobs);
  const [autoExpire, setAutoExpire] = useState(settings.autoExpireJobs ?? true);
  const [autoDeleteSpam, setAutoDeleteSpam] = useState(settings.autoDeleteSpamJobs ?? true);
  const [saved, setSaved] = useState(false);

  // Add Admin Modal State
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Moderator Admin');

  React.useEffect(() => {
    if (settings) {
      setFee(settings.platformFeePercent?.toString() || '10');
      setMinRate(settings.minHourlyRate?.toString() || '15000');
      setMaint(settings.maintenanceMode ?? false);
      setAutoApprove(settings.autoApproveJobs ?? true);
      setAutoExpire(settings.autoExpireJobs ?? true);
      setAutoDeleteSpam(settings.autoDeleteSpamJobs ?? true);
    }
  }, [settings]);

  const [adminUsers, setAdminUsers] = useState([
    { id: 'ADM-1', name: 'Super Admin Bekzod', email: 'admin@baito.uz', role: 'Super Admin', status: 'Faol' },
    { id: 'ADM-2', name: 'Moderator Sardor', email: 'moderator@baito.uz', role: 'Moderator Admin', status: 'Faol' },
  ]);

  const [auditLogs] = useState([
    { id: 'L-101', admin: 'Super Admin Bekzod', action: "Komissiya stavkasini 10% ga o'zgartirdi", ip: '213.230.88.1', time: '2026-07-24 10:30' },
    { id: 'L-102', admin: 'Moderator Sardor', action: "ID #102 e'lonni tasdiqladi", ip: '213.230.88.5', time: '2026-07-24 09:15' },
  ]);

  /** `parseFloat(x) || fallback` reads a typed 0 as falsy and silently swaps in
   *  the fallback, so a 0% commission — a promotion, a pilot customer — could
   *  not be saved at all. The API also takes whole numbers only, and a typed
   *  "12.5" was sent through as 12.5 and rejected. */
  const wholeNumber = (raw: string, fallback: number, min: number, max: number) => {
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      platformFeePercent: wholeNumber(fee, 10, 0, 50),
      minHourlyRate: wholeNumber(minRate, 15000, 0, 10_000_000),
      maintenanceMode: maint,
      autoApproveJobs: autoApprove,
      autoExpireJobs: autoExpire,
      autoDeleteSpamJobs: autoDeleteSpam,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminName.trim() && newAdminEmail.trim()) {
      setAdminUsers([
        ...adminUsers,
        {
          id: `ADM-${adminUsers.length + 1}`,
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          role: newAdminRole,
          status: 'Faol',
        },
      ]);
      setNewAdminName('');
      setNewAdminEmail('');
      setIsAddAdminOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-xs">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders size={20} className="text-indigo-600" />
            <span>{a.settingsTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">{a.settingsSubtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'general', label: a.tabGeneral },
            { id: 'admins', label: a.tabAdmins },
            { id: 'logs', label: a.tabLogs },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {a.platformFeeLabel}
                </label>
                <div className="relative mt-1">
                  <input
                    aria-label={a.platformFeeLabel}
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full pl-4 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  />
                  <Percent size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  {a.platformFeeHelp}
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {a.minHourlyRate}
                </label>
                <div className="relative mt-1">
                  <input
                    aria-label={a.minHourlyRate}
                    type="number"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value)}
                    className="w-full pl-4 pr-14 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    UZS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  Ish beruvchilar kiritishi mumkin bo'lgan minimal soatlik to'lov
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{a.autoApproveTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{a.autoApproveDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoApprove(!autoApprove)}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  {autoApprove ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{a.autoExpireTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{a.autoExpireDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoExpire(!autoExpire)}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  {autoExpire ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{a.autoDeleteSpamTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{a.autoDeleteSpamDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDeleteSpam(!autoDeleteSpam)}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  {autoDeleteSpam ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/70">
                <div>
                  <div className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert size={15} className="text-rose-600" />
                    {a.maintenanceTitle}
                  </div>
                  <div className="text-[11px] text-rose-700/80 mt-0.5">{a.maintenanceDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaint(!maint)}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  {maint ? <ToggleRight size={32} className="text-rose-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="h-11 px-6 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                {saved ? <CheckCircle2 size={16} className="text-white" /> : <Save size={16} />}
                <span>{saved ? 'Saqlandi!' : 'Sozlamalarni Saqlash'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Tizim Administratorlari</h3>
              <p className="text-slate-500 text-xs mt-0.5">Admin paneliga to'liq yoki cheklangan huquqqa ega xodimlar</p>
            </div>
            <button
              onClick={() => setIsAddAdminOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Plus size={14} /> Yangi Admin
            </button>
          </div>

          <div className="space-y-2">
            {adminUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">{u.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-lg">
                    {u.role}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 font-semibold text-[10px] rounded-md">
                    {u.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Audit Trail Tarixi</h3>
              <p className="text-slate-500 text-xs mt-0.5">Tizim parametrlari va komissiya stavkalari o'zgarishi</p>
            </div>
          </div>
          <div className="space-y-2">
            {auditLogs.map((l) => (
              <div
                key={l.id}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{l.admin} - {l.action}</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{l.ip} • {l.time}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                  {l.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Admin In-Page Modal */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Yangi Admin Qo'shish</h3>
              </div>
              <button
                onClick={() => setIsAddAdminOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  To'liq Ismi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Aziz Rahimov"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email manzili <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@baito.uz"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rol</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <option value="Moderator Admin">Moderator Admin</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Moliya Admin">Moliya Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-extrabold text-white text-xs shadow-xs cursor-pointer"
                >
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
