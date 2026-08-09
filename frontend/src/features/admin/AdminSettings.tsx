import React, { useState } from 'react';
import { SystemSettings } from './types';
import { Sliders, Save, CheckCircle2, ShieldAlert, ToggleLeft, ToggleRight, Plus } from 'lucide-react';

interface AdminSettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newCfg: Partial<SystemSettings>) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'admins' | 'logs'>('general');
  const [fee, setFee] = useState(settings.platformFeePercent.toString());
  const [minRate, setMinRate] = useState(settings.minHourlyRate.toString());
  const [maint, setMaint] = useState(settings.maintenanceMode);
  const [autoApprove, setAutoApprove] = useState(settings.autoApproveJobs);
  const [autoExpire, setAutoExpire] = useState(settings.autoExpireJobs ?? true);
  const [autoDeleteSpam, setAutoDeleteSpam] = useState(settings.autoDeleteSpamJobs ?? true);
  const [saved, setSaved] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      platformFeePercent: parseFloat(fee) || 10,
      minHourlyRate: parseFloat(minRate) || 15000,
      maintenanceMode: maint,
      autoApproveJobs: autoApprove,
      autoExpireJobs: autoExpire,
      autoDeleteSpamJobs: autoDeleteSpam,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAdmin = () => {
    const name = prompt('Admin ismini kiriting:');
    const email = prompt('Admin emailini kiriting:');
    if (name && email) {
      setAdminUsers([...adminUsers, { id: `ADM-${adminUsers.length + 1}`, name, email, role: 'Moderator Admin', status: 'Faol' }]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders size={20} className="text-indigo-600" />
            <span>Platforma Sozlamalari va Boshqaruv</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Tizim parametrlari, admin rollari va audit jurnali</p>
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'general', label: 'Sozlamalar' },
            { id: 'admins', label: 'Admin Rollari' },
            { id: 'logs', label: 'Audit Loglari' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Platforma Komissiyasi (%)</label>
                <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Minimal Soatlik Ish Haqi (UZS)</label>
                <input type="number" value={minRate} onChange={(e) => setMinRate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl font-bold" />
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">E'lonlarni Avto-Tasdiqlash</div>
                  <div className="text-[11px] text-slate-500">Moderatsiyasiz darhol e'lonlar xaritada ko'rinadi</div>
                </div>
                <button type="button" onClick={() => setAutoApprove(!autoApprove)} className="cursor-pointer">
                  {autoApprove ? <ToggleRight size={30} className="text-emerald-600" /> : <ToggleLeft size={30} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">E'lonlarni Avto-O'chirish (Auto-Expiration)</div>
                  <div className="text-[11px] text-slate-500">14 kundan ortiq eskirgan e'lonlarni avto-o'chirish/arxivlash</div>
                </div>
                <button type="button" onClick={() => setAutoExpire(!autoExpire)} className="cursor-pointer">
                  {autoExpire ? <ToggleRight size={30} className="text-emerald-600" /> : <ToggleLeft size={30} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Spam / Qoidabuzar E'lonlarni Avto-O'chirish</div>
                  <div className="text-[11px] text-slate-500">Shubhali so'zlar aniqlanganda avtomatik o'chirish</div>
                </div>
                <button type="button" onClick={() => setAutoDeleteSpam(!autoDeleteSpam)} className="cursor-pointer">
                  {autoDeleteSpam ? <ToggleRight size={30} className="text-emerald-600" /> : <ToggleLeft size={30} className="text-slate-400" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div>
                  <div className="text-xs font-extrabold text-red-900 flex items-center gap-1.5"><ShieldAlert size={15} className="text-red-600" /> Maintenance Rejimi</div>
                  <div className="text-[11px] text-red-700/80">Yangi e'lon va to'lovlar vaqtincha to'xtatiladi</div>
                </div>
                <button type="button" onClick={() => setMaint(!maint)} className="cursor-pointer">
                  {maint ? <ToggleRight size={30} className="text-red-600" /> : <ToggleLeft size={30} className="text-slate-400" />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-2">
              {saved ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Save size={16} />}
              <span>{saved ? 'Saqlandi!' : 'Sozlamalarni Saqlash'}</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Tizim Adminlari</h3>
            <button onClick={handleAddAdmin} className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer">
              <Plus size={14} /> Qo'shish
            </button>
          </div>
          <div className="space-y-2">
            {adminUsers.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">{a.name}</span>
                  <span className="text-[11px] text-slate-500">{a.email}</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">{a.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Audit Trail</h3>
          <div className="space-y-2">
            {auditLogs.map((l) => (
              <div key={l.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{l.admin} - {l.action}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{l.ip} • {l.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
