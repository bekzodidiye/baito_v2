import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser } from './types';
import {
  Phone,
  Mail,
  MapPin,
  EyeOff,
  Eye,
  MonitorSmartphone,
  CreditCard,
  Building2,
  Copy,
  Check,
  Award,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { UserDocumentsSection } from './UserDocumentsSection';

interface UserTabsMainProps {
  user: AdminUser;
  activeTab: number;
}

export const UserTabsMain: React.FC<UserTabsMainProps> = ({ user, activeTab }) => {
  const language = useAuthStore((st) => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [showPassport, setShowPassport] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  if (activeTab === 1) {
    return (
      <div className="space-y-3.5">
        {/* Core Account & Contact Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Phone */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{a.phoneNumber}</span>
                <span className="text-xs sm:text-[13px] font-black text-slate-900 block truncate mt-0.5">
                  {user.phone || a.noPhone}
                </span>
              </div>
            </div>
            {user.phone && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.phone!, 'phone')}
                  className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Nusxalash"
                >
                  {copiedField === 'phone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
                <a
                  href={`tel:${user.phone}`}
                  className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Qo'ng'iroq qilish"
                >
                  <Phone size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{a.emailAddress}</span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate mt-0.5">
                  {user.email || a.notEntered}
                </span>
              </div>
            </div>
            {user.email && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.email!, 'email')}
                  className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Nusxalash"
                >
                  {copiedField === 'email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
                <a
                  href={`mailto:${user.email}`}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Email yuborish"
                >
                  <Mail size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Region */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{a.regionLabel}</span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate mt-0.5">
                {user.region || a.notEntered}
              </span>
            </div>
          </div>

          {/* Bank Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <CreditCard size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Bank Karta</span>
              <span className="text-xs sm:text-[13px] font-mono font-bold text-slate-900 block truncate mt-0.5">
                {user.bankCardMask || a.notEntered}
              </span>
            </div>
          </div>

          {/* Device & Source */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <MonitorSmartphone size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Qurilma & Manba</span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate mt-0.5">
                {(!user.sourceApp || user.sourceApp === 'Web') ? 'Web (Brauzer)' : user.sourceApp}
              </span>
            </div>
          </div>

          {/* Company (if employer or companyName exists) */}
          {(user.companyName || user.role === 'employer') && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{a.companyNameLabel}</span>
                <span className="text-xs sm:text-[13px] font-black text-slate-900 block truncate mt-0.5">
                  {user.companyName || a.notEntered}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Passport / ID Serial Bar */}
        <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck2 size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pasport / ID Karta Seriyasi</span>
              <span className="text-xs sm:text-[13px] font-mono font-black text-slate-900 tracking-wider block mt-0.5">
                {user.passportSeries
                  ? showPassport
                    ? user.passportSeries
                    : `${user.passportSeries.substring(0, 2)} ••••••••`
                  : a.notEntered}
              </span>
            </div>
          </div>
          {user.passportSeries && (
            <button
              type="button"
              onClick={() => setShowPassport(!showPassport)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200/80 text-xs shrink-0 shadow-2xs"
            >
              {showPassport ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showPassport ? 'Yashirish' : "Ko'rish"}</span>
            </button>
          )}
        </div>

        {/* Passport images & PINFL */}
        <UserDocumentsSection user={user} />
      </div>
    );
  }

  if (activeTab === 2) {
    return (
      <div className="space-y-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              {a.professionAndSpeciality}
            </span>
            <div className="text-sm sm:text-base font-black text-brand-primary flex items-center gap-2">
              <Award size={18} className="text-brand-primary shrink-0" />
              <span>{user.category || 'Qurilish Ustasi'}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              {a.skillsLabel}
            </span>
            {(() => {
              const rawSkills: unknown = user.skills;
              let skillsList: string[] = [];
              if (Array.isArray(rawSkills)) {
                skillsList = rawSkills.filter((s): s is string => typeof s === 'string');
              } else if (typeof rawSkills === 'string') {
                try {
                  const parsed = JSON.parse(rawSkills);
                  skillsList = Array.isArray(parsed) ? parsed : [rawSkills];
                } catch {
                  skillsList = rawSkills.split(',').map((s) => s.trim()).filter(Boolean);
                }
              }

              if (skillsList.length === 0) {
                return <div className="text-xs text-slate-400 font-medium">Ko'nikmalar kiritilmagan</div>;
              }

              return (
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles size={11} className="text-brand-primary shrink-0" />
                      <span>{String(s)}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                {a.completedJobsLabel}
              </span>
              <div className="text-sm font-black text-slate-900">{user.completedJobsCount || 0} ta</div>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                {a.ratingLabel}
              </span>
              <div className="text-sm font-black text-slate-900">⭐ {Number(user.rating || 0).toFixed(1)}</div>
            </div>
          </div>

          {user.bio && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                {a.aboutThemLabel}
              </span>
              <p className="p-3.5 bg-slate-50/80 rounded-2xl text-xs leading-relaxed text-slate-700 font-medium border border-slate-100">
                {user.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
