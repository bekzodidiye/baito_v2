import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { clickable } from '../../utils/clickable';
import { AdminUser } from './types';
import {
  Search, UserCheck, Phone, Ban, CheckCircle, Eye, Users, ShieldAlert,
  Building2, User as UserIcon, X, Check, Copy, ExternalLink, ChevronDown
} from 'lucide-react';
import { UserDetailModal } from './UserDetailModal';
import { BanUserModal } from './BanUserModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { RoleSelect } from './AdminCustomControls';

interface AdminUsersProps {
  users: AdminUser[];
  onAddBalance: (userId: string, amount: number, reason: string) => void;
  onChangeRole: (userId: string, role: string) => void;
  onToggleBan: (userId: string, isBanned?: boolean, reason?: string) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users, onAddBalance, onChangeRole, onToggleBan }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned' | 'verified'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUser | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: AdminUser; role: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const roleLabel = (role: string) =>
    role === 'admin' ? 'Admin' : role === 'employer' ? a.roleEmployer : a.roleWorker;

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.companyName && u.companyName.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'banned' && u.isBanned) ||
      (statusFilter === 'active' && !u.isBanned) ||
      (statusFilter === 'verified' && u.isVerified);
    return matchSearch && matchRole && matchStatus;
  });

  const totalWorkers = users.filter(u => u.role === 'worker').length;
  const totalEmployers = users.filter(u => u.role === 'employer').length;
  const totalVerified = users.filter(u => u.isVerified).length;
  const totalBanned = users.filter(u => u.isBanned).length;

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{a.usersLabel}</span>
            <Users size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-slate-900">{users.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ishchilar</span>
            <UserIcon size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-brand-primary">{totalWorkers}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ish beruvchilar</span>
            <Building2 size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600">{totalEmployers}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasdiqlangan</span>
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{totalVerified}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bloklangan</span>
            <ShieldAlert size={16} className="text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600">{totalBanned}</div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Search input with clear */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={a.searchUsersPlaceholder}
            type="text"
            placeholder={a.searchUsersPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {(['all', 'worker', 'employer'] as const).map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer capitalize transition-all ${
                  roleFilter === rf
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {rf === 'all' ? 'Barchasi' : rf === 'worker' ? 'Ishchilar' : 'Ish beruvchilar'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: 'all', label: 'Barcha holatlar' },
              { id: 'verified', label: 'Verifikatsiya' },
              { id: 'banned', label: 'Bloklangan' },
            ].map(sf => (
              <button
                key={sf.id}
                onClick={() => setStatusFilter(sf.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  statusFilter === sf.id
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-5">Foydalanuvchi</th>
                <th className="p-4">Rol</th>
                <th className="p-4">{a.phone}</th>
                <th className="p-4">Balans</th>
                <th className="p-4 pr-5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Users size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">{a.noUsersFound}</p>
                      <p className="text-xs text-slate-400 mt-1">Qidiruv parametrlarini o'zgartirib ko'ring</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/90 transition-colors group ${
                      u.isBanned ? 'bg-red-50/30' : ''
                    }`}
                  >
                    {/* User Identity Column */}
                    <td className="p-4 pl-5">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        {...clickable(() => setSelectedUser(u))}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 font-black text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt=""
                                className="w-full h-full rounded-2xl object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                                  if (target.src !== fallback) {
                                    target.src = fallback;
                                  }
                                }}
                              />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          {u.isVerified && (
                            <span
                              className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-xs"
                              title="Tasdiqlangan foydalanuvchi"
                            >
                              <Check size={10} className="text-white stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors flex items-center gap-2">
                            <span>{u.name}</span>
                            {u.isBanned && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-md border border-red-200 uppercase">
                                BLOKLANGAN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            {u.companyName ? (
                              <span className="text-slate-600 font-semibold">{u.companyName}</span>
                            ) : (
                              <span>ID: {u.id.substring(0, 8)}...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Selection Dropdown */}
                    <td className="p-4">
                      <RoleSelect
                        value={u.role}
                        onChange={(val) => setRoleChange({ user: u, role: val })}
                      />
                    </td>

                    {/* Phone Column with Copy */}
                    <td className="p-4 font-semibold text-slate-700">
                      {u.phone ? (
                        <button
                          onClick={() => handleCopy(u.phone!, u.id)}
                          className="flex items-center gap-1.5 group/phone hover:text-brand-primary transition-colors cursor-pointer text-xs"
                          title="Raqamdan nusxa olish"
                        >
                          <Phone size={13} className="text-slate-400 group-hover/phone:text-brand-primary" />
                          <span>{u.phone}</span>
                          {copiedId === u.id ? (
                            <Check size={12} className="text-emerald-500 ml-0.5" />
                          ) : (
                            <Copy size={11} className="text-slate-300 opacity-0 group-hover/phone:opacity-100 transition-opacity ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Biriktirilmagan</span>
                      )}
                    </td>

                    {/* Balance Column */}
                    <td className="p-4 font-black font-mono text-emerald-600 tracking-tight">
                      {Number(u.balance ?? 0).toLocaleString('uz-UZ')} UZS
                    </td>

                    {/* Actions Column */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition-all active:scale-95 shadow-2xs"
                        >
                          <Eye size={13} className="text-slate-600" />
                          <span>Batafsil</span>
                        </button>

                        <button
                          onClick={() => (u.isBanned ? setUnbanTarget(u) : setBanTarget(u))}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-xl text-xs cursor-pointer transition-all active:scale-95 border ${
                            u.isBanned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {u.isBanned ? <CheckCircle size={13} /> : <Ban size={13} />}
                          <span>{u.isBanned ? 'Unban' : 'Ban'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Count */}
        <div className="p-3.5 px-5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>
            Jami {filteredUsers.length} ta foydalanuvchi ko'rsatilmoqda (Jami bazada: {users.length})
          </span>
          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            Foydalanuvchi qatoriga bosib batafsil profilni ko'rishingiz mumkin
          </span>
        </div>
      </div>

      {/* Modals for Ban, Unban, Role Confirmation & Details */}
      {banTarget && (
        <BanUserModal
          userName={banTarget.name}
          onClose={() => setBanTarget(null)}
          onConfirmBan={(reason, details) => {
            onToggleBan(banTarget.id, banTarget.isBanned, [reason, details].filter(Boolean).join(' — '));
            setBanTarget(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!roleChange}
        title={a.confirmRoleChange}
        message={
          roleChange
            ? `${roleChange.user.name}: ${roleLabel(roleChange.user.role)} -> ${roleLabel(roleChange.role)}. `
              + (roleChange.role === 'admin'
                  ? 'Admin roli butun platformaga to\'liq kirish beradi.'
                  : 'Bu foydalanuvchining huquqlarini o\'zgartiradi.')
            : ''
        }
        confirmText="O'zgartirish"
        cancelText="Bekor qilish"
        isDestructive={roleChange?.role === 'admin'}
        onConfirm={() => roleChange && onChangeRole(roleChange.user.id, roleChange.role)}
        onCancel={() => setRoleChange(null)}
      />

      <ConfirmModal
        isOpen={!!unbanTarget}
        title="Blokdan chiqarishni tasdiqlang"
        message={`${unbanTarget?.name ?? ''} yana platformadan foydalana oladi. Davom etasizmi?`}
        confirmText="Blokdan chiqarish"
        cancelText="Bekor qilish"
        isDestructive={false}
        onConfirm={() => unbanTarget && onToggleBan(unbanTarget.id, unbanTarget.isBanned)}
        onCancel={() => setUnbanTarget(null)}
      />

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
