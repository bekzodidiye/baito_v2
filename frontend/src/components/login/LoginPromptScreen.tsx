import React from 'react';
import { useLoginPrompt } from '../../hooks/useLoginPrompt';
import { LoginPromptHeader } from './LoginPromptHeader';
import { LoginPromptStepper } from './LoginPromptStepper';
import { LoginPromptFooter } from './LoginPromptFooter';
import { LoginPromptBody } from './LoginPromptBody';
import { PrivacyScreen } from '../settings/PrivacyScreen';

interface LoginPromptScreenProps {
  isModal?: boolean;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

export const LoginPromptScreen: React.FC<LoginPromptScreenProps> = ({ 
  isModal = false, 
  onClose, 
  initialMode 
}) => {
  const p = useLoginPrompt({ isModal, onClose, initialMode });
  const { mode, setMode, handleBack, t } = p;

  return (
    <div
      ref={p.outerScreenRef}
      data-allow-guest="true"
      className={`${
        isModal
          ? 'w-full h-full bg-white'
          : 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center overflow-y-auto'
      } font-sans text-slate-900`}
    >
      <div
        className={`w-full flex flex-col overflow-hidden relative bg-white/95 backdrop-blur-xl mx-auto ${
          isModal
            ? 'h-full rounded-[24px]'
            : mode === 'login'
            ? 'max-w-[390px] sm:max-w-[410px] my-auto rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-white/50 min-h-[440px]'
            : 'max-w-[450px] sm:max-w-[480px] my-auto rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-white/50 min-h-[480px]'
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

      {p.showPrivacy && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col h-full w-full">
          <PrivacyScreen 
            onBack={() => p.setShowPrivacy(false)} 
            onConfirm={() => {
              p.setShowPrivacy(false);
              p.setAgreeTerms(true);
            }}
          />
        </div>
      )}
    </div>
  );
};
