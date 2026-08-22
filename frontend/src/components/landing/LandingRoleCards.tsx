import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS } from './LandingData';
import { UserCheck, Building2, CheckCircle2, ArrowRight, ShieldCheck, Users, Clock, CreditCard } from 'lucide-react';

interface LandingRoleCardsProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingRoleCards: React.FC<LandingRoleCardsProps> = ({ onSelectRole }) => {
  const { language, requireAuth } = useApp();
  const [activeRole, setActiveRole] = useState<'worker' | 'employer'>('worker');
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const workerSteps = [
    { title: "Profil va ID Verification", desc: "Pasport yoki ID ma'lumotlar bilan 2 daqiqada tasdiqlash" },
    { title: "Smena va Xarita", desc: "Yaqin masofadagi mos smenani tanlash va bir bosing bilan ariza" },
    { title: "Smenani Bajarish", desc: "Belgilangan manzilga borib vaqtida ishni muvaffaqiyatli topshirish" },
    { title: "Darhol Pul Olish", desc: "Ish beruvchi tasdiqlashi bilan maosh to'g'ridan-to'g'ri kartaga" },
  ];

  const employerSteps = [
    { title: "E'lon va Smena Joylash", desc: "Vaqt, joylashuv, talablar va smena maoshini kiritish" },
    { title: "Top-Nomzodlar Ro'yxati", desc: "Reytingi baland, tasdiqlangan ID ga ega nomzodlar bilan chat" },
    { title: "Smenaga Qabul Qilish", desc: "Nomzodni tanlash va avtomatik bildirishnoma yuborish" },
    { title: "Smena Yakuni va Baholash", desc: "Ishni qabul qilib, bir bosing bilan maosh o'tkazish" },
  ];

  const steps = activeRole === 'worker' ? workerSteps : employerSteps;

  return (
    <section id="roles" className="py-12 lg:py-16 bg-white font-sans border-b border-slate-200 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">
            <Users size={14} />
            <span>Dual Platforma</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{t.rolesTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">{t.rolesSubtitle}</p>

          {/* Role Switcher Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 mt-4">
            <button
              onClick={() => setActiveRole('worker')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeRole === 'worker'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck size={16} />
              <span>Ishchilar uchun 👷‍♂️</span>
            </button>
            <button
              onClick={() => setActiveRole('employer')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeRole === 'employer'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={16} />
              <span>Ish beruvchilar uchun 🏢</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Process & Action Content */}
        <div className="max-w-5xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((st, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2 relative">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xs">
                  {idx + 1}
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">{st.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <span>Barcha xizmatlar xavfsiz va shaffof shartnoma asosida ishlaydi</span>
            </div>

            <button
              onClick={() => onSelectRole(activeRole)}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                activeRole === 'worker'
                  ? 'bg-brand-primary hover:bg-brand-primary-container text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              <span>{activeRole === 'worker' ? t.workerBtn : t.employerBtn}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
