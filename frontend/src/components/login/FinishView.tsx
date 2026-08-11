import React from 'react';
import { Smartphone, Lock, Eye, EyeOff, Check, ArrowRight, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface FinishViewProps {
  selectedRole?: 'worker' | 'employer' | null;
  regPhone: string;
  setRegPhone: (val: string) => void;
  regPassword: string;
  setRegPassword: (val: string) => void;
  regConfirmPassword: string;
  setRegConfirmPassword: (val: string) => void;
  regCode: string;
  setRegCode: (val: string) => void;
  isCodeSent: boolean;
  setIsCodeSent: (val: boolean) => void;
  isSendingCode: boolean;
  sendVerificationCode: () => void;
  regShowPassword: boolean;
  setRegShowPassword: (val: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (val: boolean) => void;
  finishSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleFinishSubmit: (e: React.FormEvent) => void;
  t: any;
  isModal: boolean;
  onOpenPrivacy?: () => void;
}

export const FinishView: React.FC<FinishViewProps> = ({
  regPhone,
  setRegPhone,
  regPassword,
  setRegPassword,
  regConfirmPassword,
  setRegConfirmPassword,
  regCode,
  setRegCode,
  isCodeSent,
  setIsCodeSent,
  isSendingCode,
  sendVerificationCode,
  regShowPassword,
  setRegShowPassword,
  agreeTerms,
  setAgreeTerms,
  finishSubmitRef,
  handleFinishSubmit,
  t,
  isModal,
  onOpenPrivacy,
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
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">
              {t.finishPhone}
            </label>
            {isCodeSent && (
              <button
                type="button"
                onClick={() => setIsCodeSent(false)}
                className="text-[10px] font-bold text-brand-primary hover:text-brand-primary transition-colors flex items-center gap-1"
              >
                <Edit2 size={12} />
                Tahrirlash
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Smartphone size={16} className="stroke-[2.2]" />
            </span>
            <input
              type="tel"
              required
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              disabled={isCodeSent}
              placeholder={t.phonePlaceholder}
              className={`w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-24 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-350 shadow-3xs ${isCodeSent ? 'text-slate-400 bg-slate-50 border-transparent cursor-not-allowed' : 'text-slate-755'}`}
            />
            {!isCodeSent && (
              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={isSendingCode || regPhone.length < 9}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCode ? '...' : (t.sendCode || 'Kodni olish')}
              </button>
            )}
            {isCodeSent && (
               <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary">
                 <Check size={16} className="stroke-[2.5]" />
               </div>
            )}
          </div>
        </div>

        {/* Tasdiqlash kodi */}
        {isCodeSent && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1.5 overflow-hidden"
          >
            <label className="text-[10px] font-black text-slate-450 px-1 uppercase tracking-wider">
              {t.verifyCode || 'Tasdiqlash kodi'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={16} className="stroke-[2.2]" />
              </span>
              <input
                type="text"
                required
                value={regCode}
                onChange={(e) => setRegCode(e.target.value)}
                placeholder="1234"
                maxLength={6}
                className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-4 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
              />
            </div>
            <div className="flex justify-end pt-1 pr-1">
               <button
                 type="button"
                 onClick={sendVerificationCode}
                 disabled={isSendingCode}
                 className="text-[10px] font-bold text-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50"
               >
                 {isSendingCode ? '...' : 'Qayta yuborish'}
               </button>
            </div>
          </motion.div>
        )}

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
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-11 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
            />
            <button
              type="button"
              onClick={() => setRegShowPassword(!regShowPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
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
              className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 pl-11 pr-11 text-xs font-semibold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
            />
            <button
              type="button"
              onClick={() => setRegShowPassword(!regShowPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
            >
              {regShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Terms and conditions checkbox */}
        <div className="flex items-start gap-3 pt-2 group">
          <input
            type="checkbox"
            checked={agreeTerms}
            readOnly
            className="hidden"
          />
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
            agreeTerms 
              ? 'border-brand-primary bg-brand-primary text-white shadow-3xs' 
              : 'border-slate-300 hover:border-slate-400 bg-white'
          }`}>
            {agreeTerms && <Check size={12} className="stroke-[3]" />}
          </div>
          <div className="text-[11px] font-bold text-slate-500 leading-normal select-none">
            {t.finishAgree}
            {' '}
            <button 
              type="button"
              onClick={onOpenPrivacy}
              className="text-brand-primary underline ml-1 hover:text-brand-primary/80 transition-colors"
            >
              (Maxfiylik Siyosati)
            </button>
            {!agreeTerms && (
               <div className="text-red-500 text-[10px] mt-1 font-medium">Royxatdan o'tish uchun maxfiylik siyosati bilan tanishib, tasdiqlang.</div>
            )}
          </div>
        </div>

      </form>
    </motion.div>
  );
};
