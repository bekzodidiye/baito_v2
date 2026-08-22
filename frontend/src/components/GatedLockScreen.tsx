import React from 'react';
import { useApp } from '../context/AppContext';
import { LockKeyhole, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface GatedLockScreenProps {
  onOpenAuth: () => void;
}

const GATED_TEXTS = {
  uz: {
    title: "Tizimga kiring",
    desc: "Ushbu sahifani ko'rish uchun profilingizga kirishingiz kerak.",
    btn: "Tizimga kirish"
  },
  ru: {
    title: "Войдите в аккаунт",
    desc: "Чтобы просмотреть эту страницу, вам необходимо войти в свой профиль.",
    btn: "Войти"
  },
  en: {
    title: "Sign In Required",
    desc: "Please log in to your profile to access this section.",
    btn: "Sign In"
  }
};

export const GatedLockScreen: React.FC<GatedLockScreenProps> = ({ onOpenAuth }) => {
  const { language } = useApp();
  const t = GATED_TEXTS[language] || GATED_TEXTS.uz;

  return (
    <div data-allow-guest="true" className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-5 w-full max-w-sm mx-auto">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className="w-full bg-white rounded-[20px] border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.03)] p-8 text-center relative overflow-hidden"
      >
        {/* Minimal Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

        {/* Premium Minimal Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Decorative pulsing halo */}
            <div className="absolute inset-0 bg-brand-primary/5 rounded-full scale-130 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-brand-primary/5 text-brand-primary flex items-center justify-center border border-brand-primary/10 shadow-xs">
              <LockKeyhole size={24} className="stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Simple Elegant Title */}
        <h2 
          className="font-sans text-xl font-extrabold text-slate-800 tracking-tight mb-2"
          id="gated-lock-title"
        >
          {t.title}
        </h2>

        {/* Single line description */}
        <p className="text-slate-400 text-xs sm:text-[13px] font-medium leading-relaxed max-w-[240px] mx-auto mb-8">
          {t.desc}
        </p>

        {/* High-fidelity Elegant Interactive CTA Button */}
        <button
          onClick={onOpenAuth}
          className="w-full py-3.5 px-6 bg-brand-primary hover:bg-brand-primary-container text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 border-0 shadow-lg shadow-brand-primary/8 hover:shadow-xl hover:shadow-brand-primary/12 active:scale-98 cursor-pointer"
          id="gated-lock-login-btn"
        >
          <span>{t.btn}</span>
          <ArrowRight size={14} className="stroke-[2.5]" />
        </button>
      </motion.div>
    </div>
  );
};
