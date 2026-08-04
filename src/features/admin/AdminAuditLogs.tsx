import React, { useState } from 'react';
import { AdminLog } from './types';
import { ShieldAlert, Search, Filter, Download, UserCheck, Ban, Trash2, CheckCircle2 } from 'lucide-react';

const INITIAL_LOGS: AdminLog[] = [
  {
    id: 'log-1',
    adminName: 'Sardor Rahim (Super Admin)',
    role: 'Super Admin',
    action: 'Foydalanuvchini Ban Qildi',
    target: 'Alisher Qodirov (+998 90 123 45 67)',
    ipAddress: '213.230.12.98',
    details: 'Spam e\'lon joylagani va firibgarlik gumoni sababli 30 kunga ban berildi.',
    timestamp: 'Bugun, 14:32',
  },
  {
    id: 'log-2',
    adminName: 'Malika Y. (Moderator)',
    role: 'Moderator',
    action: 'Pasport Tasdiqlandi',
    target: 'Javohir Tursunov (ID: #USR-9921)',
    ipAddress: '178.218.201.44',
    details: 'Pasport rasmlari va selfie mos keldi. Verified status berildi.',
    timestamp: 'Bugun, 12:15',
  },
  {
    id: 'log-3',
    adminName: 'Sardor Rahim (Super Admin)',
    role: 'Super Admin',
    action: 'E\'lon Rad Etildi va O\'chirildi',
    target: 'E\'lon: "Tezkor boyib ketish vakansiyasi"',
    ipAddress: '213.230.12.98',
    details: 'Qoidabuzar e\'lon o\'chirildi va ish beruvchiga ogohlantirish yuborildi.',
    timestamp: 'Kecha, 18:45',
  },
  {
    id: 'log-4',
    adminName: 'Otabek M. (Moliya Nazoratchi)',
    role: 'Moderator',
    action: 'Escrow Pulini Yechish (Dispute Resolve)',
    target: 'Nizo #DISP-402',
    ipAddress: '84.54.80.12',
    details: '70% ishchiga, 30% ish beruvchiga qaytarish bo\'yicha qaror chiqarildi.',
    timestamp: '22-Iyul, 09:20',
  },
];

export const AdminAuditLogs: React.FC = () => {
  const [logs] = useState<AdminLog[]>(INITIAL_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Super Admin' | 'Moderator'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExportCSV = () => {
    alert('Audit loglar CSV formatida muvaffaqiyatli yuklab olindi!');
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
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Admin nomi, amal yoki nishon bo'yicha qidiruv..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Barcha Rollar</option>
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
                <th className="p-4">Vaqt & IP</th>
                <th className="p-4">Admin / Moderator</th>
                <th className="p-4">Amal (Action)</th>
                <th className="p-4">Nishon (Target)</th>
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
