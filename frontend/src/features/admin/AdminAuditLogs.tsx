import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrapList } from '../../api/client';
import { AdminLog } from './types';
import { 
  ShieldAlert, Search, Filter, Download, UserCheck, Ban, CheckCircle2, 
  Clock, ShieldCheck, Activity, Globe, Loader2 
} from 'lucide-react';

// Human labels for the action slugs the backend records.
const ACTION_LABELS: Record<string, string> = {
  'user.ban': 'Foydalanuvchini bloklandi',
  'user.unban': 'Blokdan chiqarildi',
  'user.update': "Rol/verifikatsiya o'zgartirildi",
  'user.balance': "Balans o'zgartirildi",
  'user.note': "Izoh qo'shildi",
  'job.status': "E'lon holati o'zgartirildi",
  'job.worker': 'Ishchi tayinlandi',
  'job.cancel': "E'lon bekor qilindi",
  'settings.update': "Sozlamalar o'zgartirildi",
  'broadcast': 'Ommaviy xabar yuborildi',
  'withdrawal.approve': "Yechish tasdiqlandi",
  'withdrawal.reject': 'Yechish rad etildi',
  'escrow.release': "To'lov chiqarildi",
  'escrow.refund': 'Mablag\' qaytarildi',
};

interface AuditRow {
  id: string;
  adminName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  note: string | null;
  createdAt: string | null;
}

const toAdminLog = (r: AuditRow): AdminLog => ({
  id: r.id,
  adminName: r.adminName || 'Administrator',
  role: r.targetType || undefined,
  action: ACTION_LABELS[r.action] || r.action,
  target: [r.targetType, r.targetId].filter(Boolean).join(' · ') || '—',
  ipAddress: r.ipAddress || undefined,
  details: r.note || (r.details ? JSON.stringify(r.details) : undefined),
  timestamp: r.createdAt ? new Date(r.createdAt).toLocaleString('uz-UZ') : '—',
});

export const AdminAuditLogs: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const res = await apiClient('/admin/audit-logs?limit=200');
      return (unwrapList(res) as AuditRow[]).map(toAdminLog);
    },
  });
  const logs: AdminLog[] = data ?? [];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const securityActionsCount = logs.filter(
    l => l.action.toLowerCase().includes('blok') || l.action.toLowerCase().includes('bekor') || l.action.toLowerCase().includes('rad')
  ).length;

  const handleExportCSV = () => {
    const header = ['Vaqt', 'Administrator', 'Amal', 'Obyekt', 'IP', 'Izoh'];
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...filteredLogs.map((l) =>
        [l.timestamp, l.adminName, l.action, l.target, l.ipAddress ?? '', l.details ?? '']
          .map(escape).join(','),
      ),
    ].join('\n');

    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const dlLink = document.createElement('a');
    dlLink.href = url;
    dlLink.download = `baito-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    dlLink.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jami Qaydlar</span>
            <Activity size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{logs.length} ta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">So'nggi 200 ta operatsiya</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Xavfsizlik Choralari</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600">{securityActionsCount} ta</div>
          <div className="text-[11px] font-bold text-rose-600/80 mt-1">Bloklash va bekor qilishlar</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Audit Holati</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">Faol</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Tizim 100% himoyalangan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">So'nggi Harakat</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="text-xs font-bold text-slate-800 truncate mt-1">
            {logs[0]?.timestamp || "Qayd etilmagan"}
          </div>
          <div className="text-[11px] font-bold text-blue-600 mt-0.5 truncate">
            {logs[0]?.adminName || 'Tizim'}
          </div>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            aria-label={a.searchAuditLogs}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={a.searchAuditLogsPlaceholder}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <option value="all">{a.allActions}</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Moderator">Moderator</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-xs active:scale-95"
          >
            <Download size={14} />
            CSV yuklab olish
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">{a.timeAndIp}</th>
                <th className="px-4 py-3.5">Admin / Moderator</th>
                <th className="px-4 py-3.5">Amal (Action)</th>
                <th className="px-4 py-3.5">{a.targetLabel}</th>
                <th className="px-4 py-3.5">Batafsil Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Yuklanmoqda…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">
                    Hech qanday audit jurnali topilmadi
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-800 block text-xs">{log.timestamp}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        <Globe size={10} className="text-slate-400" />
                        {log.ipAddress || '127.0.0.1'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block text-xs">{log.adminName}</span>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-extrabold mt-0.5 ${
                        log.role === 'Super Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.role || 'Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                        {log.action.toLowerCase().includes('blok') || log.action.toLowerCase().includes('bekor') || log.action.toLowerCase().includes('rad') ? (
                          <Ban size={14} className="text-rose-500" />
                        ) : log.action.toLowerCase().includes('tasdiq') ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : (
                          <UserCheck size={14} className="text-indigo-500" />
                        )}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 font-mono text-xs">
                      {log.target}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate font-medium" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
