import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, HelpCircle, Settings } from 'lucide-react';
import { MODAL_TRANSLATIONS } from './menu/MenuTranslations';
import { ProfileContent } from './menu/ProfileContent';
import { SettingsContent } from './menu/SettingsContent';
import { HelpContent } from './menu/HelpContent';
import { useAuthStore } from "../store/useAuthStore";
import { Orb } from "@/components/ui/thinking-orbs";

const LoginPromptScreen = React.lazy(() => import('./login/LoginPromptScreen').then(m => ({ default: m.LoginPromptScreen })));

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'settings' | 'help' | 'auth' | null;
}

export const MenuModals: React.FC<MenuModalProps> = ({ isOpen, onClose, type }) => {
  const language = useAuthStore(s => s.language);
  const lastTypeRef = React.useRef(type);
  if (type) {
    lastTypeRef.current = type;
  }
  const currentType = type || lastTypeRef.current;
  const showModal = isOpen && Boolean(currentType);

  const t = MODAL_TRANSLATIONS[language];

  return (
    <AnimatePresence mode="wait">
      {showModal && (
        <div key="menu-modal-root" className="fixed inset-0 z-[6000] flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className={`relative bg-white w-full rounded-[24px] shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col pointer-events-auto text-slate-900 ${
              currentType === 'auth'
                ? 'max-w-md max-h-[94vh] md:max-h-[91vh]'
                : currentType === 'settings'
                ? 'max-w-5xl h-[88vh] max-h-[88vh]'
                : 'max-w-md max-h-[85vh]'
            } z-10`}
          >
          {currentType === 'auth' ? (
            <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><Orb state="working" size={24} className="text-brand-primary" /></div>}>
                <LoginPromptScreen isModal onClose={onClose} />
              </Suspense>
            </div>
          ) : (
            <>
              {/* Desktop Close button for Settings modal */}
              {currentType === 'settings' && (
                <button
                  onClick={onClose}
                  aria-label="Yopish"
                  className="hidden md:flex absolute top-4 right-4 z-40 p-2 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-white/80 backdrop-blur-xs border border-slate-200/60 shadow-2xs"
                >
                  <X size={18} />
                </button>
              )}

              {/* Header (visible on mobile for settings, always visible for profile/help) */}
              <div className={`flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white ${
                currentType === 'settings' ? 'md:hidden' : ''
              }`}>
                <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                  {currentType === 'profile' && (
                    <>
                      <User size={20} className="text-brand-primary" />
                      <span>{t.profileTitle}</span>
                    </>
                  )}
                  {currentType === 'settings' && (
                    <>
                      <Settings size={20} className="text-brand-primary" />
                      <span>{t.settingsTitle}</span>
                    </>
                  )}
                  {currentType === 'help' && (
                    <>
                      <HelpCircle size={20} className="text-brand-primary" />
                      <span>{t.helpTitle}</span>
                    </>
                  )}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content Container */}
              <div className={`flex-1 min-h-0 ${
                currentType === 'settings' ? 'p-0 overflow-hidden flex flex-col md:flex-row' : 'overflow-y-auto p-6 space-y-6'
              }`}>
                {currentType === 'profile' && <ProfileContent onClose={onClose} />}
                {currentType === 'settings' && <SettingsContent onClose={onClose} />}
                {currentType === 'help' && <HelpContent />}
              </div>
            </>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
