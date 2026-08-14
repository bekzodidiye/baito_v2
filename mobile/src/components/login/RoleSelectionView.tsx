import React from 'react';
import { Briefcase, Building2, Info, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface RoleSelectionViewProps {
  selectedRole: 'worker' | 'employer' | null;
  setSelectedRole: (role: 'worker' | 'employer') => void;
  handleRoleContinue: () => void;
  setMode: (mode: 'login' | 'role-selection' | 'profile-info' | 'documents' | 'finish') => void;
  t: any;
  isModal: boolean;
}

export const RoleSelectionView: React.FC<RoleSelectionViewProps> = ({
  selectedRole,
  setSelectedRole,
  handleRoleContinue,
  setMode,
  t,
}) => {
  return (
    <motion.div
      key="role-selection"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full space-y-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-[#000666] tracking-tight">
          {t.roleQuestion || 'Kim sifatida davom etasiz?'}
        </h2>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
          {t.roleSubtitle || "ROLINGIZNI TANLANG, KEYIN O'ZGARTIRIB BO'LMAYDI"}
        </p>
      </div>

      {/* Roles Cards Stack */}
      <div className="space-y-3.5 w-full max-w-[380px] mx-auto">
        {/* WORKER ROLE */}
        <button
          type="button"
          onClick={() => setSelectedRole('worker')}
          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
            selectedRole === 'worker'
              ? 'border-[#000666] bg-blue-50/60 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-[#000666] flex items-center justify-center shrink-0">
            <Briefcase size={20} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-sm font-bold text-slate-755 mb-0.5">{t.ishchi || 'Ishchi'}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.ishchiDesc || "Ish qidirish, rezyume yaratish va bo'sh ish o'rinlariga ariza topshirish uchun."}
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              selectedRole === 'worker' ? 'border-[#000666] bg-[#000666]' : 'border-slate-300 bg-transparent'
            }`}>
              {selectedRole === 'worker' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>

        {/* EMPLOYER ROLE */}
        <button
          type="button"
          onClick={() => setSelectedRole('employer')}
          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
            selectedRole === 'employer'
              ? 'border-brand-primary bg-brand-primary/10/60 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
            <Building2 size={20} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-sm font-bold text-slate-755 mb-0.5">{t.ishBeruvchi || 'Ish beruvchi'}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {t.ishBeruvchiDesc || "E'lonlar joylashtirish, munosib xodimlarni topish va ish jarayonini boshqarish uchun."}
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              selectedRole === 'employer' ? 'border-brand-primary bg-brand-primary' : 'border-slate-300 bg-transparent'
            }`}>
              {selectedRole === 'employer' && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Disclaimer Callout Box */}
      <div className="w-full max-w-[380px] mx-auto bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-start gap-2.5">
        <Info size={16} className="text-slate-500 shrink-0 stroke-[2.2] mt-0.5" />
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          {t.disclaimer || "Siz bitta hisob bilan bir vaqtda ham ishchi, ham ish beruvchi bo'la olmaysiz."}
        </p>
      </div>

      {/* Continue Button & Switch Prompt */}
      <div className="w-full max-w-[380px] mx-auto space-y-3">
        <button
          disabled={!selectedRole}
          onClick={handleRoleContinue}
          className={`w-full py-3 px-6 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.99] ${
            selectedRole
              ? 'bg-[#000666] hover:bg-[#000444] text-white shadow-md cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>{t.davomEtish || 'Davom etish'}</span>
          <ArrowRight size={15} className="stroke-[2.5]" />
        </button>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-500">
            {t.hasAccount || 'Hisobingiz bormi?'}{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-[#000666] hover:underline font-extrabold bg-transparent border-0 p-0 cursor-pointer ml-1"
            >
              {t.loginTitle || 'Tizimga kirish'}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
