import React from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Mail, ScanEye, Headphones, Check } from 'lucide-react';
import { useVerificationPending } from '../../hooks/useVerificationPending';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const VerificationPendingScreen: React.FC = () => {
  const { language, setCurrentScreen, handleDashboardClick, t, stepT, handleSupportClick } = useVerificationPending();

  return (
    <div className="fixed inset-0 z-50 bg-brand-background md:p-6 lg:p-8 flex items-center justify-center font-sans overflow-hidden">
      <div className="w-full h-full flex flex-col overflow-hidden relative bg-white mx-auto max-w-md md:h-[85vh] md:max-h-[850px] md:rounded-[24px] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] md:border md:border-slate-200/80/50">
      {/* Top Navigation */}
      <header className="w-full shrink-0 bg-white border-b border-slate-200/80 z-40 flex justify-between items-center px-4 h-16 shadow-3xs rounded-t-[20px] md:rounded-t-[24px]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentScreen('profile')}
            className="p-2 hover:bg-slate-50 transition-colors rounded-full text-brand-navy cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-95"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <h1 className="font-display text-base font-black text-brand-navy">{t.headerTitle}</h1>
        </div>
      </header>

      {/* Persistent Sticky Stepper */}
      <div className="w-full mx-auto shrink-0 bg-white pt-5 pb-3 px-6 z-40 border-b border-slate-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between w-full max-w-[280px] mx-auto px-1">
          {/* Step 1 */}
          <button 
            type="button"
            onClick={() => setCurrentScreen('profile')}
            className="flex flex-col items-center relative z-10 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-3xs transition-all duration-300 group-hover:scale-105">
              <Check size={14} className="stroke-[3]" />
            </div>
            <span className="text-[9px] font-black tracking-wider mt-2.5 text-brand-primary uppercase">{stepT.step1}</span>
          </button>
          {/* Line 1-2 */}
          <div className="flex-1 h-0.5 mx-2 -mt-6 relative z-0 bg-brand-primary transition-colors duration-300"></div>
          
          {/* Step 2 */}
          <button 
            type="button"
            onClick={() => setCurrentScreen('profile')}
            className="flex flex-col items-center relative z-10 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-3xs transition-all duration-300 group-hover:scale-105">
              <Check size={14} className="stroke-[3]" />
            </div>
            <span className="text-[9px] font-black tracking-wider mt-2.5 text-brand-primary uppercase">{stepT.step2}</span>
          </button>
          {/* Line 2-3 */}
          <div className="flex-1 h-0.5 mx-2 -mt-6 relative z-0 bg-brand-primary transition-colors duration-300"></div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center relative z-10">
            <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-3xs transition-all duration-300">
              <Check size={14} className="stroke-[3]" />
            </div>
            <span className="text-[9px] font-black tracking-wider mt-2.5 text-brand-primary uppercase">{stepT.step3}</span>
          </div>
        </div>
      </div>

      {/* Main Container (Scrollable inside the page frame, preventing any bottom-button clipping) */}
      <main className="w-full flex-1 min-h-0 px-4 flex flex-col pt-6 overflow-y-auto no-scrollbar pb-6">

        <div className="text-center mb-6">
          <h2 className="font-display text-lg font-black text-brand-navy mb-2 leading-snug">{t.mainTitle}</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Central Compact Biometric Scanner / Card Verification */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Document Verification Visualizer with Laser Scan Effect */}
          <div className="relative w-full max-w-sm mx-auto bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] overflow-hidden">
            {/* Background decorative subtle grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(var(--color-brand-primary)_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div className="flex items-center gap-4 relative z-10 text-left">
              {/* Premium Animated Biometric ID Card Container */}
              <div className="relative w-20 h-14 bg-slate-50 border border-slate-200/80/80 rounded-lg p-2 flex flex-col justify-between overflow-hidden shrink-0 shadow-inner">
                {/* Horizontal Neon Laser Scanner Line */}
                <div className="absolute left-0 right-0 h-[2px] bg-brand-primary shadow-[0_0_8px_var(--color-brand-primary)] opacity-80 animate-scan-laser"></div>
                
                {/* ID Card Skeleton Graphics */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-slate-200 shrink-0"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-1 bg-slate-200 rounded w-8"></div>
                    <div className="h-1 bg-slate-200 rounded w-10"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-1 bg-slate-200 rounded w-full"></div>
                  <div className="h-[2px] bg-brand-primary/20 rounded w-2/3"></div>
                </div>
              </div>

              {/* Status information right next to it */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-black text-brand-navy text-xs tracking-tight leading-none">
                    {t.verifying}
                  </span>
                  <span className="text-[8px] text-brand-primary font-black uppercase tracking-widest bg-brand-primary/5 px-2 py-0.5 rounded-full leading-none animate-pulse">
                    {language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'Ожидание' : "Pending"}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 leading-normal">
                  {language === 'uz' ? 'Hujjatlaringiz xavfsiz tekshirilmoqda' : language === 'ru' ? 'Ваши документы безопасно проверяются' : "Your documents are being securely verified"}
                </p>
              </div>
            </div>

            {/* Micro progress line at the very bottom border of the card */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-50 overflow-hidden">
              <div className="h-full bg-brand-primary w-1/3 rounded-full animate-pulse-slow"></div>
            </div>
          </div>

          {/* Compact Moderation Description */}
          <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] max-w-sm mx-auto">
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              {t.moderationDesc.split("1-24").map((part, i) => i === 1 ? <span key={i} className="font-black text-brand-primary">1-24{part}</span> : part)}
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 mb-4">
          {/* Document Card */}
          <div className="flex items-center p-4.5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-200">
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-brand-navy mr-4 shadow-inner border border-slate-100">
              <ShieldCheck size={22} className="text-brand-primary stroke-[2]" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xs font-black text-brand-navy leading-snug">{t.docCardTitle}</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t.docCardSub}</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 text-brand-navy text-[9px] font-black uppercase tracking-wider">
              {t.pendingBadge}
            </div>
          </div>

          {/* Email Notification Card */}
          <div className="flex items-center p-4.5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02),_0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] transition-all duration-200">
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-brand-navy mr-4 shadow-inner border border-slate-100">
              <Mail size={22} className="text-brand-primary stroke-[2]" />
            </div>
            <div className="flex-grow">
              <h3 className="text-xs font-black text-brand-navy leading-snug">{t.emailCardTitle}</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t.emailCardSub}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Premium Sticky Bottom Footer (Consistently styled, stays fixed with safety rounded bottom corners) */}
      <div className="shrink-0 bg-white border-t border-slate-100 px-5 pt-4 pb-3 md:rounded-b-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30 w-full mx-auto relative">
        <div className="flex flex-col gap-3 max-w-[288px] mx-auto">
          <button 
            onClick={handleDashboardClick}
            className="w-full h-[50px] bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl flex items-center justify-center gap-2 font-display font-black text-xs active:scale-[0.98] transition-transform shadow-[0_8px_25px_rgba(0,6,102,0.18)] cursor-pointer border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <span>{t.btnDashboard}</span>
            <ArrowRight size={15} className="stroke-[2.5]" />
          </button>

          {/* Footer Support Link */}
          <div className="text-center">
            <a
              href="https://t.me/baito_admin"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold hover:underline text-[11px] text-brand-primary flex items-center justify-center gap-1.5"
            >
              <Headphones size={14} className="stroke-[2.2]" />
              <span>{t.support}</span>
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
