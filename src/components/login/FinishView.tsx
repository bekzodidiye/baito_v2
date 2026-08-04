import React from 'react';
import { Smartphone, Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FinishViewProps {
  selectedRole?: 'worker' | 'employer' | null;
  regPhone: string;
  setRegPhone: (val: string) => void;
  regPassword: string;
  setRegPassword: (val: string) => void;
  regConfirmPassword: string;
  setRegConfirmPassword: (val: string) => void;
  regShowPassword: boolean;
  setRegShowPassword: (val: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (val: boolean) => void;
  finishSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleFinishSubmit: (e: React.FormEvent) => void;
  t: any;
  isModal: boolean;
}

export const FinishView: React.FC<FinishViewProps> = ({
  regPhone,
  setRegPhone,
  regPassword,
  setRegPassword,
  regConfirmPassword,
  setRegConfirmPassword,
  regShowPassword,
  setRegShowPassword,
  agreeTerms,
  setAgreeTerms,
  finishSubmitRef,
  handleFinishSubmit,
  t,
  isModal,
}) => {
  return (
    <motion.div
      key="finish"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header Info */}
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight mb-1">
          {t.finishTitle}
        </h1>
        <p className="text-xs text-slate-500 font-semibold">{t.finishSubtitle}</p>
      </div>

      {/* Form Credentials */}
      <form id="finish-form" noValidate onSubmit={handleFinishSubmit} className="space-y-4">
        <button type="submit" ref={finishSubmitRef} className="hidden" />

        {/* Telefon raqam */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-450 px-1 uppercase tracking-wider">
            {t.finishPhone}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Smartphone size={16} className="stroke-[2.2]" />
            </span>
            <input
              type="tel"
              required
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-4 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
            />
          </div>
        </div>

        {/* Parol yaratish */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-450 px-1 uppercase tracking-wider">
            {t.finishPassword}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={16} className="stroke-[2.2]" />
            </span>
            <input
              type={regShowPassword ? 'text' : 'password'}
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-11 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
            />
            <button
              type="button"
              onClick={() => setRegShowPassword(!regShowPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 bg-transparent border-0 cursor-pointer p-0"
            >
              {regShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Parolni tasdiqlang */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-450 px-1 uppercase tracking-wider">
            {t.finishConfirmPassword}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={16} className="stroke-[2.2]" />
            </span>
            <input
              type={regShowPassword ? 'text' : 'password'}
              required
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-11 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
            />
            <button
              type="button"
              onClick={() => setRegShowPassword(!regShowPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 bg-transparent border-0 cursor-pointer p-0"
            >
              {regShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Terms and conditions checkbox */}
        <label className="flex items-start gap-3 pt-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="hidden"
          />
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
            agreeTerms 
              ? 'border-brand-primary bg-brand-primary text-white shadow-3xs' 
              : 'border-slate-300 hover:border-slate-400 bg-white'
          }`}>
            {agreeTerms && <Check size={12} className="stroke-[3]" />}
          </div>
          <span className="text-[11px] font-bold text-slate-500 leading-normal select-none group-hover:text-slate-700 transition-colors">
            {t.finishAgree}
          </span>
        </label>

      </form>
    </motion.div>
  );
};
