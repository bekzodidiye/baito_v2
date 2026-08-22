import React from 'react';
import { ArrowRight, Check, HeadphonesIcon } from 'lucide-react';

interface LoginPromptFooterProps {
  mode: 'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login';
  isModal?: boolean;
  handleProfileSubmit: () => void;
  handleDocumentsSubmit: () => void;
  handleFinishSubmit: () => void;
  t: any;
}

export const LoginPromptFooter: React.FC<LoginPromptFooterProps> = ({
  mode,
  isModal,
  handleProfileSubmit,
  handleDocumentsSubmit,
  handleFinishSubmit,
  t,
}) => {
  if (!['profile-info', 'documents', 'finish'].includes(mode)) return null;

  return (
    <div className={`shrink-0 bg-white border-t border-slate-100 px-6 pt-4 pb-4 z-30 ${isModal ? 'relative w-full' : 'sticky bottom-0 w-full flex justify-center bg-white border-t border-slate-100'}`}>
      <div className="w-full mx-auto max-w-[380px]">
        {mode === 'profile-info' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleProfileSubmit()}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[16px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 border-0 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <span>{t.davomEtish}</span>
              <ArrowRight size={16} className="stroke-[2.5]" />
            </button>
            <div className="text-center">
              <a
                href="https://t.me/baito_admin"
                target="_blank"
                rel="noreferrer"
                className="font-extrabold hover:underline text-[11px] text-emerald-600 flex items-center justify-center gap-1.5"
              >
                <HeadphonesIcon size={14} className="stroke-[2.2]" />
                <span>{t.adminConnect}</span>
              </a>
            </div>
          </div>
        )}

        {mode === 'documents' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleDocumentsSubmit()}
              className="w-full py-3.5 px-6 rounded-[16px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 border-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <span>{t.davomEtish}</span>
              <ArrowRight size={16} className="stroke-[2.5]" />
            </button>
            <div className="text-center">
              <a
                href="https://t.me/baito_admin"
                target="_blank"
                rel="noreferrer"
                className="font-extrabold hover:underline text-[11px] text-emerald-600 flex items-center justify-center gap-1.5"
              >
                <HeadphonesIcon size={14} className="stroke-[2.2]" />
                <span>{t.adminConnect}</span>
              </a>
            </div>
          </div>
        )}

        {mode === 'finish' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleFinishSubmit()}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[16px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 border-0 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <span>{t.finishButton}</span>
              <Check size={16} className="stroke-[2.5]" />
            </button>
            <div className="text-center">
              <a
                href="https://t.me/baito_admin"
                target="_blank"
                rel="noreferrer"
                className="font-extrabold hover:underline text-[11px] text-[#000666] flex items-center justify-center gap-1.5"
              >
                <HeadphonesIcon size={14} className="stroke-[2.2]" />
                <span>{t.adminConnect}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
