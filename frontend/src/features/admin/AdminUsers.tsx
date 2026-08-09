import React, { useState } from 'react';
import { AdminUser } from './types';
import { Search, UserCheck, PlusCircle, Phone, Ban, CheckCircle, Eye } from 'lucide-react';
import { UserDetailModal } from './UserDetailModal';

interface AdminUsersProps {
  users: AdminUser[];
  onAddBalance: (userId: string, amount: number) => void;
  onChangeRole: (userId: string, role: string) => void;
  onToggleBan: (userId: string, isBanned?: boolean) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users, onAddBalance, onChangeRole, onToggleBan }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.companyName && u.companyName.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ism, telefon yoki kompaniya..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'worker', 'employer'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer capitalize ${
                roleFilter === rf ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {rf === 'all' ? 'Barchasi' : rf === 'worker' ? 'Ishchilar' : 'Ish beruvchilar'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Foydalanuvchi</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Telefon</th>
                <th className="p-4">Balans</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">Foydalanuvchilar topilmadi</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${u.isBanned ? 'bg-red-50/40' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedUser(u)}>
                        <div className="w-9 h-9 rounded-full bg-slate-100 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {u.name}
                            {u.isVerified && <UserCheck size={14} className="text-emerald-600 shrink-0" />}
                            {u.isBanned && <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-black rounded-md">BLOKLANGAN</span>}
                          </div>
                          {u.companyName && <div className="text-[11px] text-slate-500 font-medium">{u.companyName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => onChangeRole(u.id, e.target.value)}
                        className="bg-slate-100 font-bold text-slate-700 px-2.5 py-1 rounded-lg text-xs border border-slate-200/60 cursor-pointer"
                      >
                        <option value="worker">Ishchi</option>
                        <option value="employer">Ish beruvchi</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{u.phone || 'Biriktirilmagan'}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600">
                      {(parseFloat(u.balance || '0')).toLocaleString('uz-UZ')} UZS
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          <Eye size={13} className="text-slate-600" /> Batafsil
                        </button>
                        <button
                          onClick={() => onToggleBan(u.id, u.isBanned)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-xl text-xs cursor-pointer ${
                            u.isBanned ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {u.isBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAddBalance={onAddBalance}
          onChangeRole={onChangeRole}
          onToggleBan={onToggleBan}
        />
      )}
    </div>
  );
};

