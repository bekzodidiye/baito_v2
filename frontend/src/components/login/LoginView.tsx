import React from 'react';
import { Smartphone, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  loginPhone: string;
  setLoginPhone: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  loginSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleLoginSubmit: (e: React.FormEvent) => void;
  setMode: (mode: 'login' | 'role-selection' | 'profile-info' | 'documents' | 'finish') => void;
  t: any;
  language: string;
  isModal: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginPhone,
  setLoginPhone,
  loginPassword,
  setLoginPassword,
  showPassword,
  setShowPassword,
  loginSubmitRef,
  handleLoginSubmit,
  setMode,
  t,
  language,
}) => {
  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="text-center pt-2 w-full mx-auto">
        <h1 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight mb-2">
          {t.loginTitle || 'Tizimga kirish'}
        </h1>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {language === 'uz'
            ? 'Tizimga kirish uchun telefoningiz va parolingizni kiriting'
            : language === 'ru'
            ? 'Введите телефон и пароль для входа'
            : 'Enter your phone and password to enter'}
        </p>
      </div>

      <form id="login-form" noValidate onSubmit={handleLoginSubmit} className="space-y-4 w-full mx-auto">
        <button type="submit" ref={loginSubmitRef} className="hidden" />

        {/* Telefon raqam */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {t.phoneLabel || 'TELEFON RAQAM *'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Smartphone size={16} className="stroke-[2.2]" />
            </span>
            <input
              type="tel"
              required
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder={t.phonePlaceholder || '+998 (90) 123-45-67'}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-[12px] py-3.5 pl-11 pr-4 text-[13px] font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
            />
          </div>
        </div>

        {/* Parol */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider">
            {t.passwordLabel || 'PAROL *'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={16} className="stroke-[2.2]" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder={t.passwordPlaceholder || 'Parolingizni kiriting'}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-[12px] py-3.5 pl-11 pr-11 text-[13px] font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all placeholder:text-slate-400 shadow-sm text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={(e) => handleLoginSubmit(e)}
          className="w-full mt-4 py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-[16px] text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 border-0 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <span>{t.loginBtn || 'Kirish'}</span>
          <Check size={16} className="stroke-[2.5]" />
        </button>

        {/* Register Prompt Switch */}
        <div className="text-center pt-2">
          <p className="text-xs font-medium text-slate-500">
            {t.noAccount || "Hisobingiz yo'qmi?"}{' '}
            <button
              type="button"
              onClick={() => setMode('role-selection')}
              className="text-emerald-600 hover:underline font-bold bg-transparent border-0 p-0 cursor-pointer ml-1"
            >
              {t.regTitle || "Ro'yxatdan o'tish"}
            </button>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

