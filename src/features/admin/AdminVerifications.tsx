import React, { useState } from 'react';
import { AdminUser } from './types';
import { ShieldCheck, FileText, CheckCircle2, XCircle, User, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VerificationDetailModal } from './VerificationDetailModal';
import { showToast } from '../../utils/toast';

interface AdminVerificationsProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export const AdminVerifications: React.FC<AdminVerificationsProps> = ({ users, onRefresh }) => {
  const { } = useApp();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const handleVerify = async (userId: string, approve: boolean) => {
    try {
      const { apiClient } = await import('../../api/client');
      await apiClient(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified: approve }),
      });
      (approve ? "Foydalanuvchi va hujjatlari tasdiqlandi" : "Hujjatlar rad etildi");
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-blue-600" />
          <span>Foydalanuvchilar va Hujjatlarni Verifikatsiya Qilish</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Shaxsni tasdiqlovchi hujjat (Pasport / ID) topshirgan foydalanuvchilar ro'yxati. Tasdiqlashdan oldin barcha hujjatlarni ko'rib chiqing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold">
            Verifikatsiya so'rovlari mavjud emas
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-brand-primary font-bold flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden group-hover:border-blue-500 transition-colors">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{u.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{u.phone || 'Telefon kiritilmagan'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">• {u.region || 'Toshkent'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {u.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      <CheckCircle2 size={13} /> Tasdiqlangan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                      Kutilmoqda
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => setSelectedUser(u)}
                className="bg-slate-50 hover:bg-blue-50/50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600 shrink-0" />
                  <span>Pasport / ID Karta + Selfie (Biriktirilgan)</span>
                </div>
                <span className="text-blue-600 font-extrabold flex items-center gap-1 text-[11px]">
                  <Eye size={13} /> Ko'rish
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedUser(u)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye size={14} className="text-slate-600" /> Barcha Ma'lumot va Hujjatlar
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleVerify(u.id, false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <XCircle size={14} /> Rad etish
                  </button>
                  <button
                    onClick={() => handleVerify(u.id, true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircle2 size={14} /> Tasdiqlash
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedUser && (
        <VerificationDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
};
