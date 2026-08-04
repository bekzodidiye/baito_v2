import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface LoginPromptHeaderProps {
  mode: 'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login';
  setMode: (mode: 'login' | 'role-selection' | 'profile-info' | 'documents' | 'finish') => void;
  handleBack: () => void;
  isModal?: boolean;
  onClose?: () => void;
  t: any;
}

export const LoginPromptHeader: React.FC<LoginPromptHeaderProps> = ({
  mode,
  handleBack,
  isModal,
  onClose,
  t,
}) => {
  return (
    <header className="w-full shrink-0 bg-white border-b border-slate-100 h-12 flex items-center px-5 justify-between rounded-t-2xl">
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-slate-100 transition-colors rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 border-0 bg-transparent flex items-center justify-center"
          title="Orqaga"
         aria-label="Orqaga">
<ArrowLeft size={17} className="stroke-[2.2]" />
        </button>
        <span className="text-xs font-bold text-slate-900">
          {mode === 'login' ? (t.loginTitle || 'Tizimga kirish') : (t.regTitle || "Ro'yxatdan o'tish")}
        </span>
      </div>

      {isModal && onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 transition-colors rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 border-0 bg-transparent"
        >
          <X size={17} className="stroke-[2.2]" />
        </button>
      )}
    </header>
  );
};


