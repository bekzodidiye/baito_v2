import React from 'react';
import { Check } from 'lucide-react';

interface LoginPromptStepperProps {
  mode: 'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login';
  setMode: (mode: 'login' | 'role-selection' | 'profile-info' | 'documents' | 'finish') => void;
  firstName: string;
  t: any;
}

export const LoginPromptStepper: React.FC<LoginPromptStepperProps> = ({
  mode,
  setMode,
  firstName,
  t,
}) => {
  if (!['profile-info', 'documents', 'finish'].includes(mode)) return null;

  return (
    <div className="w-full shrink-0 bg-white pt-4 pb-3 px-6 z-40 border-b border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="relative flex items-start justify-between w-full max-w-[280px] mx-auto">
        {/* Background Line */}
        <div className="absolute top-4 left-[40px] right-[40px] h-[2px] bg-slate-200 z-0">
          <div
            className="h-full bg-brand-primary transition-all duration-300 ease-in-out"
            style={{ width: mode === 'profile-info' ? '0%' : mode === 'documents' ? '50%' : '100%' }}
          ></div>
        </div>

        {/* Step 1 */}
        <button
          type="button"
          onClick={() => setMode('profile-info')}
          className="flex flex-col items-center relative z-10 bg-transparent border-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 w-20"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs transition-all duration-300 ${mode === 'profile-info' ? 'bg-brand-primary text-white scale-110' : 'bg-brand-primary text-white'}`}>
            {mode === 'profile-info' ? '1' : <Check size={14} className="stroke-[3]" />}
          </div>
          <span className={`text-[9px] font-black tracking-wider mt-2 uppercase whitespace-nowrap transition-colors ${mode === 'profile-info' ? 'text-brand-primary' : 'text-brand-primary'}`}>{t.step1}</span>
        </button>

        {/* Step 2 */}
        <button
          type="button"
          onClick={() => {
            if (mode === 'finish' || mode === 'documents') setMode('documents');
          }}
          className="flex flex-col items-center relative z-10 bg-transparent border-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 w-20"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs transition-all duration-300 ${mode === 'documents' ? 'bg-brand-primary text-white scale-110' : mode === 'finish' ? 'bg-brand-primary text-white' : 'border border-slate-200/80 bg-white text-slate-400'}`}>
            {mode === 'finish' ? <Check size={14} className="stroke-[3]" /> : '2'}
          </div>
          <span className={`text-[9px] font-black tracking-wider mt-2 uppercase whitespace-nowrap transition-colors ${mode === 'documents' ? 'text-brand-primary' : mode === 'finish' ? 'text-brand-primary' : 'text-slate-400'}`}>{t.step2}</span>
        </button>

        {/* Step 3 */}
        <button
          type="button"
          onClick={() => { if (firstName) setMode('finish'); }}
          className="flex flex-col items-center relative z-10 bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 w-20 cursor-pointer"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs transition-all duration-300 ${mode === 'finish' ? 'bg-brand-primary text-white scale-110' : 'border border-slate-200/80 bg-white text-slate-400'}`}>
            3
          </div>
          <span className={`text-[9px] font-black tracking-wider mt-2 uppercase whitespace-nowrap transition-colors ${mode === 'finish' ? 'text-brand-primary' : 'text-slate-400'}`}>{t.step3}</span>
        </button>
      </div>
    </div>
  );
};
