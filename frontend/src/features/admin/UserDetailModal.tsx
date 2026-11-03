import React, { useState, useEffect } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser, AdminUserDetailResponse } from './types';
import {
  X,
  User,
  Briefcase,
  History,
  Wallet,
  Star,
  ShieldCheck,
  FileText,
  Ban,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Orb } from "@/components/ui/thinking-orbs";
import { BanUserModal } from './BanUserModal';
import { UserTabsMain } from './UserTabsMain';
import { UserTabsExtra } from './UserTabsExtra';

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onAddBalance: (userId: string, amount: number, reason: string) => void;
  onChangeRole: (userId: string, role: string) => void;
  onToggleBan: (userId: string, isBanned?: boolean, reason?: string) => void;
  onConfirmAssignment?: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user: initialUser,
  onClose,
  onAddBalance,
  onChangeRole,
  onToggleBan,
  onConfirmAssignment,
}) => {
  const language = useAuthStore((st) => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [activeTab, setActiveTab] = useState<number>(1);
  const [showBanModal, setShowBanModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = async (): Promise<AdminUserDetailResponse | null> => {
    try {
      const data = await apiClient(`/admin/users/${initialUser.id}/detail`);
      return data && data.user ? data : null;
    } catch (err) {
      console.error('Failed to load user detail:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    loadDetail().then((data) => {
      if (isMounted) {
        setDetail(data ?? { user: initialUser, sessions: [], transactions: [], orders: [], reviews: [] });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialUser.id]);

  const user = detail?.user || initialUser;

  const refreshDetail = async () => {
    const data = await loadDetail();
    if (data) setDetail(data);
  };

  const handleAddBalance = async (userId: string, amount: number, reason: string) => {
    await onAddBalance(userId, amount, reason);
    refreshDetail();
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await onChangeRole(userId, role);
    refreshDetail();
  };

  const handleToggleBan = async (userId: string, currentBannedState?: boolean, reason?: string) => {
    await onToggleBan(userId, currentBannedState, reason);
    refreshDetail();
  };

  const copyId = () => {
    if (!user.id) return;
    navigator.clipboard?.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const tabs = [
    { id: 1, label: 'Shaxsiy', icon: <User size={13} /> },
    ...(user.role === 'worker' ? [{ id: 2, label: 'Malakali', icon: <Briefcase size={13} /> }] : []),
    { id: 3, label: 'Buyurtmalar', icon: <History size={13} /> },
    { id: 4, label: 'Moliya', icon: <Wallet size={13} /> },
    { id: 5, label: 'Sharhlar', icon: <Star size={13} /> },
    { id: 6, label: 'Xavfsizlik', icon: <ShieldCheck size={13} /> },
    { id: 7, label: 'Admin Izohlari', icon: <FileText size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl sm:max-w-2xl w-full shadow-2xl border border-slate-200/80 overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white relative shrink-0 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            title="Yopish"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-indigo-800 text-white font-black text-xl flex items-center justify-center border border-brand-primary/20 overflow-hidden shrink-0 shadow-xs">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              ) : (
                (user.name || 'F').charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">{user.name}</h2>

                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {a.verifiedLabel}
                  </span>
                )}

                {user.isBanned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200/80">
                    <Ban size={10} /> Bloklangan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap text-slate-500 text-xs">
                <span className="font-semibold text-slate-600">{user.phone || a.noPhone}</span>
                <span className="text-slate-300">•</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                    user.role === 'employer'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                      : user.role === 'worker'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      : 'bg-purple-50 text-purple-700 border border-purple-200/80'
                  }`}
                >
                  {user.role === 'worker' ? a.roleWorker : user.role === 'employer' ? a.roleEmployer : 'Admin'}
                </span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={copyId}
                  className="font-mono text-[11px] text-slate-400 hover:text-brand-primary flex items-center gap-1 cursor-pointer transition-colors"
                  title="Foydalanuvchi ID nusxalash"
                >
                  <span>#{user.id ? user.id.substring(0, 8) : ''}</span>
                  {copiedId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="px-3 sm:px-4 py-2 bg-white border-b border-slate-100 shrink-0">
          <div className="bg-slate-100/80 p-1 rounded-2xl flex gap-1 overflow-x-auto no-scrollbar border border-slate-200/60">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-max px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-black'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 bg-slate-50/50 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Orb state="working" size={28} className="text-brand-primary" />
            </div>
          ) : detail ? (
            <>
              <UserTabsMain user={user} activeTab={activeTab} />
              <UserTabsExtra detail={detail} activeTab={activeTab} onAddBalance={handleAddBalance} />
            </>
          ) : (
            <div className="text-center text-slate-500 py-10">{a.noDataFound}</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Rol:</span>
            <select
              value={user.role}
              onChange={(e) => handleChangeRole(user.id, e.target.value)}
              className="bg-slate-50 font-bold text-xs text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all cursor-pointer shadow-2xs"
            >
              <option value="worker">{a.roleWorker}</option>
              <option value="employer">{a.roleEmployer}</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (user.isBanned) {
                  handleToggleBan(user.id, true);
                } else {
                  setShowBanModal(true);
                }
              }}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs ${
                user.isBanned
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Ban size={14} />
              <span>{user.isBanned ? 'Blokdan Chiqarish' : 'Bloklash'}</span>
            </button>

            {onConfirmAssignment && (
              <button
                onClick={onConfirmAssignment}
                className="px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer bg-brand-primary hover:bg-brand-primary/90 text-white transition-colors shadow-xs shadow-brand-primary/20 text-xs"
              >
                <CheckCircle size={15} />
                <span>Tayinlash</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors text-xs"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>

      {showBanModal && (
        <BanUserModal
          userName={user.name}
          onClose={() => setShowBanModal(false)}
          onConfirmBan={(reason, details) => {
            handleToggleBan(user.id, false, [reason, details].filter(Boolean).join(' — '));
            setShowBanModal(false);
          }}
        />
      )}
    </div>
  );
};
