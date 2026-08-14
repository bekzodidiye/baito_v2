import React, { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BanUserModal } from './BanUserModal';
import { UserTabsMain } from './UserTabsMain';
import { UserTabsExtra } from './UserTabsExtra';

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onAddBalance: (userId: string, amount: number) => void;
  onChangeRole: (userId: string, role: string) => void;
  onToggleBan: (userId: string, isBanned?: boolean) => void;
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
  const [activeTab, setActiveTab] = useState<number>(1);
  const [showBanModal, setShowBanModal] = useState(false);
  
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useApp();
  
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${API}/api/v1/admin/users/${initialUser.id}/detail`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((data: AdminUserDetailResponse) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [initialUser.id, token, API]);

  const user = detail?.user || initialUser;


  const tabs = [
    { id: 1, label: 'Shaxsiy', icon: <User size={14} /> },
    ...(user.role === 'worker' ? [{ id: 2, label: 'Malakali', icon: <Briefcase size={14} /> }] : []),
    { id: 3, label: 'Buyurtmalar', icon: <History size={14} /> },
    { id: 4, label: 'Moliya', icon: <Wallet size={14} /> },
    { id: 5, label: 'Sharhlar', icon: <Star size={14} /> },
    { id: 6, label: 'Xavfsizlik', icon: <ShieldCheck size={14} /> },
    { id: 7, label: 'Admin Izohlari', icon: <FileText size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[24px] max-w-4xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 font-black text-2xl flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black text-slate-900">{user.name}</h2>
                {user.isVerified && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Tasdiqlangan</span>}
                {user.isBanned && <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Bloklangan</span>}
              </div>
              <p className="text-slate-500 text-[12px] font-medium">{user.phone || '+998 90 123 45 67'} • <span className="font-bold text-slate-700">{user.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'}</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 bg-white shrink-0 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-max px-4 flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold transition-all cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'text-brand-primary border-brand-primary'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-brand-primary" />
            </div>
          ) : detail ? (
            <>
              <UserTabsMain user={user} activeTab={activeTab} />
              <UserTabsExtra detail={detail} activeTab={activeTab} onAddBalance={onAddBalance} />
            </>
          ) : (
            <div className="text-center text-slate-500 py-10">Ma'lumot topilmadi</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Rol:</span>
            <select value={user.role} onChange={(e) => onChangeRole(user.id, e.target.value)} className="bg-slate-50 font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all">
              <option value="worker">Ishchi</option>
              <option value="employer">Ish beruvchi</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (user.isBanned) {
                  onToggleBan(user.id, true);
                } else {
                  setShowBanModal(true);
                }
              }}
              className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                user.isBanned ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Ban size={15} />
              <span>{user.isBanned ? 'Blokdan Chiqarish' : 'Bloklash'}</span>
            </button>
            
            {onConfirmAssignment && (
              <button
                onClick={onConfirmAssignment}
                className="px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer bg-brand-primary hover:bg-brand-primary/90 text-white transition-colors shadow-sm shadow-brand-primary/20"
              >
                <CheckCircle size={16} />
                <span>Tayinlash</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showBanModal && (
        <BanUserModal
          userName={user.name}
          onClose={() => setShowBanModal(false)}
          onConfirmBan={(reason, details) => {
            onToggleBan(user.id, false);
            alert(`Foydalanuvchi bloklandi. Sabab: ${reason}. Izoh: ${details}`);
            setShowBanModal(false);
          }}
        />
      )}
    </div>
  );
};
