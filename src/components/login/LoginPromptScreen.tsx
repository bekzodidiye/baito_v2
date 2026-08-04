import React from 'react';
import { useLoginPrompt } from '../../hooks/useLoginPrompt';
import { LoginPromptHeader } from './LoginPromptHeader';
import { LoginPromptStepper } from './LoginPromptStepper';
import { LoginPromptFooter } from './LoginPromptFooter';
import { LoginPromptBody } from './LoginPromptBody';

interface LoginPromptScreenProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginPromptScreen: React.FC<LoginPromptScreenProps> = ({ 
  isModal = false, 
  onClose 
}) => {
  const p = useLoginPrompt({ isModal, onClose });
  const { mode, setMode, handleBack, t } = p;

  return (
    <div
      ref={p.outerScreenRef}
      data-allow-guest="true"
      className={`${
        isModal
          ? 'w-full h-full bg-white'
          : 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto'
      } font-sans text-slate-900`}
    >
      <div
        className={`w-full flex flex-col overflow-hidden relative bg-white mx-auto ${
          isModal
            ? 'h-full rounded-[20px]'
            : mode === 'login'
            ? 'max-w-[390px] sm:max-w-[410px] my-auto rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100/80 min-h-[440px]'
            : 'max-w-[450px] sm:max-w-[480px] my-auto rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100/80 min-h-[480px]'
        }`}
      >
        <LoginPromptHeader
          mode={mode}
          setMode={setMode}
          handleBack={handleBack}
          isModal={isModal}
          onClose={onClose}
          t={t}
        />

        {mode !== 'login' && mode !== 'role-selection' && (
          <LoginPromptStepper
            mode={mode}
            setMode={setMode}
            firstName={p.firstName}
            t={t}
          />
        )}

        {/* Main View Body */}
        <main
          ref={p.mainContainerRef}
          className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
        >
          <div className="p-5 sm:p-7 flex flex-col justify-center w-full min-h-full">
            <LoginPromptBody p={p} />
          </div>
        </main>

        <LoginPromptFooter
          mode={mode}
          isModal={isModal}
          handleProfileSubmit={p.handleProfileSubmit}
          handleDocumentsSubmit={p.handleDocumentsSubmit}
          handleFinishSubmit={p.handleFinishSubmit}
          t={t}
        />
      </div>
    </div>
  );
};
