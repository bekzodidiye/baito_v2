import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrapList } from '../../api/client';
import { AdminLog } from './types';
import { ShieldAlert, Search, Filter, Download, UserCheck, Ban, CheckCircle2 } from 'lucide-react';

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
  // Kept for rows written before escrow was removed: the log is history and
  // still holds them.
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

  const handleExportCSV = () => {
    // This used to just show an alert claiming the file had been downloaded.
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
    const a = document.createElement('a');
    a.href = url;
    a.download = `baito-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" size={24} />
            Audit Loglar va Xavfsizlik Oqimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Barcha admin va moderatorlarning tizim xavfsizligiga oid harakatlari xronologiyasi
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white font-semibold text-xs rounded-xl hover:bg-slate-900 transition cursor-pointer"
        >
          <Download size={16} />
          Loglarni Yuklab Olish (CSV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
              aria-label={a.searchAuditLogs}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={a.searchAuditLogsPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <option value="all">{a.allActions}</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Moderator">Moderator</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">{a.timeAndIp}</th>
                <th className="p-4">Admin / Moderator</th>
                <th className="p-4">Amal (Action)</th>
                <th className="p-4">{a.targetLabel}</th>
                <th className="p-4">Batafsil Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800 block">{log.timestamp}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.ipAddress || '127.0.0.1'}</span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-800 block">{log.adminName}</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold mt-0.5 ${
                      log.role === 'Super Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      {log.action.includes('Ban') ? (
                        <Ban size={14} className="text-red-500" />
                      ) : log.action.includes('Tasdiq') ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <UserCheck size={14} className="text-indigo-500" />
                      )}
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">{log.target}</td>
                  <td className="p-4 text-slate-500 max-w-xs truncate" title={log.details}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
