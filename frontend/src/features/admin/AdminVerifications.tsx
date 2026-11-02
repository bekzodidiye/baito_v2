import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser } from './types';
import {
  ShieldCheck, FileText, CheckCircle2, XCircle, User, Eye,
  Building2, Check, ExternalLink, AlertCircle, FileCheck
} from 'lucide-react';
import { VerificationDetailModal } from './VerificationDetailModal';
import { showToast } from '../../utils/toast';
import { apiClient } from '../../api/client';

interface AdminVerificationsProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export const AdminVerifications: React.FC<AdminVerificationsProps> = ({ users, onRefresh }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingVerificationUsers = users.filter(
    u => !u.isVerified && (u.passportDocFront || u.passportSeries || u.passportDocBack || u.selfieWithDoc)
  );

  const verifiedUsers = users.filter(u => u.isVerified);

  const handleVerify = async (userId: string, approve: boolean) => {
    setBusyId(userId);
    try {
      await apiClient(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          isVerified: approve,
          clearDocs: !approve
        }),
      });
      showToast(approve ? "Foydalanuvchi va hujjatlari tasdiqlandi" : "Hujjatlar rad etildi");
      onRefresh();
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kutilayotgan tekshiruvlar</span>
            <FileText size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{pendingVerificationUsers.length} ta ariza</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasdiqlangan foydalanuvchilar</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{verifiedUsers.length} ta profil</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Himoya darajasi</span>
            <ShieldCheck size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-brand-primary">KYC 2-bosqich</div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <ShieldCheck size={18} />
          </div>
          <span>{a.verificationTitle}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Shaxsni tasdiqlovchi hujjat (Pasport / ID) topshirgan foydalanuvchilar ro'yxati. Tasdiqlashdan oldin barcha hujjatlarni ko'rib chiqing.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingVerificationUsers.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileCheck size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">Verifikatsiya so'rovlari mavjud emas</p>
            <p className="text-xs text-slate-400 mt-1">Barcha yuborilgan arizalar ko'rib chiqilgan</p>
          </div>
        ) : (
          pendingVerificationUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-brand-primary/40 transition-all shadow-xs flex flex-col justify-between gap-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 text-brand-primary font-black flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-2xs group-hover:border-brand-primary/40 transition-colors">
                      {u.avatarUrl ? (
                        <img
                          alt=""
                          src={u.avatarUrl}
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
                        u.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-brand-primary transition-colors">
                        {u.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{u.phone || 'Telefon kiritilmagan'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200/60">
                          {u.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">• {u.region || 'Viloyat belgilanmagan'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                      Kutilmoqda
                    </span>
                  </div>
                </div>

                {/* Document preview row */}
                <div
                  onClick={() => setSelectedUser(u)}
                  className="bg-slate-50 hover:bg-brand-primary/5 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer transition-colors mt-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                      <FileText size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Pasport / ID Karta + Selfie</span>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {u.passportSeries ? `Seriya: ${u.passportSeries}` : "Fayllar biriktirilgan"}
                      </div>
                    </div>
                  </div>
                  <span className="text-brand-primary font-black flex items-center gap-1 text-xs">
                    <Eye size={14} /> Ko'rish
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedUser(u)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <Eye size={14} className="text-slate-600" />
                  <span>Tekshirish</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => handleVerify(u.id, false)}
                    className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <XCircle size={14} />
                    <span>Rad etish</span>
                  </button>
                  <button
                    disabled={busyId === u.id}
                    onClick={() => handleVerify(u.id, true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <CheckCircle2 size={14} />
                    <span>Tasdiqlash</span>
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
          onVerify={(_userId, approved) => {
            handleVerify(selectedUser.id, approved);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};
