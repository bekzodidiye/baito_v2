import React from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser } from './types';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  User,
  ShieldCheck,
} from 'lucide-react';
import { UserDocumentsSection } from './UserDocumentsSection';
import { formatLongDate } from '../../utils/dateFormat';

interface VerificationDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onVerify: (userId: string, approve: boolean) => void;
}

export const VerificationDetailModal: React.FC<VerificationDetailModalProps> = ({
  user,
  onClose,
  onVerify,
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const formattedDate = user.createdAt ? formatLongDate(user.createdAt, 'uz') : 'Yaqinda';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-100 text-slate-900 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 font-black text-xl flex items-center justify-center border border-blue-100 overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
              ) : (
                <User size={24} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">{user.name}</h2>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} className="text-blue-600" /> Verifikatsiya So'rovi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Hujjatlarni va shaxsiy ma'lumotlarni diqqat bilan ko'rib chiqing
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 no-scrollbar text-xs">
          {/* User Profile & Registration */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User size={14} className="text-blue-600" /> Shaxsiy va Ro'yxatdan O'tish Ma'lumotlari
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 text-slate-700">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span>{a.phoneColon} <strong className="text-slate-900">{user.phone || 'Biriktirilmagan'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span>Email: <strong className="text-slate-900">{user.email || 'Biriktirilmagan'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span>{a.regionAddressColon} <strong className="text-slate-900">{user.region || a.notEntered}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span>A'zolik Sanasi: <strong className="text-slate-900">{formattedDate}</strong></span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                <span>{a.roleCategoryColon} <strong className="text-slate-900">{user.role === 'worker' ? 'Ishchi' : 'Ish beruvchi'} ({user.category || 'Mutaxassis'})</strong></span>
              </div>
            </div>

            {user.bio && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold block mb-1">Qisqacha Tavsif:</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-medium leading-relaxed">
                  {user.bio}
                </p>
              </div>
            )}
          </div>

          {/* Passport / ID Documents */}
          <UserDocumentsSection user={user} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 cursor-pointer transition-colors"
          >
            Yopish
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onVerify(user.id, false);
                onClose();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <XCircle size={15} /> Rad Etish
            </button>
            <button
              onClick={() => {
                onVerify(user.id, true);
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <CheckCircle2 size={15} /> Hujjatlarni Tasdiqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
