import React, { useState } from 'react';
import { AdminUser } from './types';
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
} from 'lucide-react';
import { BanUserModal } from './BanUserModal';
import { UserTabsMain } from './UserTabsMain';
import { UserTabsExtra } from './UserTabsExtra';

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onAddBalance: (userId: string, amount: number) => void;
  onChangeRole: (userId: string, role: string) => void;
  onToggleBan: (userId: string, isBanned?: boolean) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  onClose,
  onAddBalance,
  onChangeRole,
  onToggleBan,
}) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [showBanModal, setShowBanModal] = useState(false);

  const tabs = [
    { id: 1, label: 'Shaxsiy', icon: User },
    { id: 2, label: 'Professional', icon: Briefcase },
    { id: 3, label: 'Buyurtmalar', icon: History },
    { id: 4, label: 'Moliya', icon: Wallet },
    { id: 5, label: 'Sharhlar', icon: Star },
    { id: 6, label: 'Xavfsizlik', icon: ShieldCheck },
    { id: 7, label: 'Admin Izohlari', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-xs">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 cursor-pointer">
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white font-black text-2xl flex items-center justify-center border border-white/20 overflow-hidden shrink-0">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{user.name}</h2>
                {user.isVerified && <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Tasdiqlangan</span>}
                {user.isBanned && <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Bloklangan</span>}
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">{user.phone || '+998 90 123 45 67'} • {user.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'}</p>
            </div>
          </div>

          {/* 7 Tab Bar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-4 mt-3 border-t border-slate-700/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          <UserTabsMain user={user} activeTab={activeTab} />
          <UserTabsExtra user={user} activeTab={activeTab} onAddBalance={onAddBalance} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Rol:</span>
            <select value={user.role} onChange={(e) => onChangeRole(user.id, e.target.value)} className="bg-white font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-300">
              <option value="worker">Ishchi</option>
              <option value="employer">Ish beruvchi</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (user.isBanned) {
                onToggleBan(user.id, true);
              } else {
                setShowBanModal(true);
              }
            }}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
              user.isBanned ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <Ban size={15} />
            <span>{user.isBanned ? 'Blokdan Chiqarish' : 'Bloklash (Sabab bilan)'}</span>
          </button>
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
