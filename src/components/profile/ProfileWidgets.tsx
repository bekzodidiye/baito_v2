import React from 'react';
import { Wallet, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ProfileWidgetsProps {
  t: any;
  language: 'uz' | 'ru' | 'en';
  showVerified: boolean;
  setToastMessage: (msg: string | null) => void;
  setCurrentScreen: (screen: string) => void;
  setActiveDialog: (dialog: 'withdraw' | 'edit' | null) => void;
  balance?: string;
}

export const ProfileWidgets: React.FC<ProfileWidgetsProps> = ({
  t,
  language,
  showVerified,
  setToastMessage,
  setCurrentScreen,
  setActiveDialog,
  balance = '0'
}) => {
  return (
    <section className="flex flex-col gap-4 shrink-0">
      {/* Wallet Balance widget */}
      <div className="bg-gradient-to-tr from-brand-primary to-brand-primary-container p-5 rounded-2xl border border-brand-primary/10 relative overflow-hidden shadow-md">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <p className="text-[10px] font-extrabold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
            <Wallet size={12} />
            <span>{t.walletTitle}</span>
          </p>
          <h3 className="text-3xl font-black text-white my-2.5 tracking-tight">{Number(balance).toLocaleString()} so'm</h3>
          <button 
            onClick={() => setActiveDialog('withdraw')}
            className="w-full py-2.5 bg-white text-brand-primary font-display font-black text-[11px] rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.15)] outline-none active:scale-[0.99]"
          >
            {t.walletBtn}
          </button>
        </div>
      </div>

      {/* Verification Widget Card */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            showVerified ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
          }`}>
            {showVerified ? <ShieldCheck size={20} className="stroke-[2]" /> : <AlertTriangle size={20} className="stroke-[2]" />}
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="font-display font-black text-xs text-slate-800">
              {showVerified ? t.verified : t.verifyTitle}
            </p>
            <p className="text-[10px] font-medium text-slate-400 leading-normal">
              {showVerified ? t.verifiedDesc : t.verifyDesc}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (showVerified) {
              setCurrentScreen('yakunlash');
            } else {
              setToastMessage(language === 'uz' ? "Hujjatlaringizni tasdiqlash uchun tizimga bog'laning." : language === 'ru' ? "Свяжитесь с поддержкой для верификации." : "Contact support for verification.");
              setTimeout(() => setToastMessage(null), 3000);
            }
          }}
          className="w-full py-2.5 bg-brand-primary text-white hover:bg-brand-primary/95 text-[11px] rounded-xl font-extrabold transition-all shadow-3xs cursor-pointer outline-none"
        >
          {showVerified ? t.verifyBtn : t.verifyTitle}
        </button>
      </div>
    </section>
  );
};
