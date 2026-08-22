import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LoginPromptScreen } from './login/LoginPromptScreen';
import { MODAL_TRANSLATIONS } from './menu/MenuTranslations';
import { ProfileContent } from './menu/ProfileContent';
import { SettingsContent } from './menu/SettingsContent';
import { HelpContent } from './menu/HelpContent';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'settings' | 'help' | 'auth' | null;
}

export const MenuModals: React.FC<MenuModalProps> = ({ isOpen, onClose, type }) => {
  const { language } = useApp();
  if (!isOpen || !type) return null;

  const t = MODAL_TRANSLATIONS[language];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
          className={`relative bg-white w-full max-w-md rounded-[20px] shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col transition-all duration-300 ${
            type === 'auth' ? 'max-h-[94vh] md:max-h-[91vh]' : 'max-h-[85vh]'
          } z-10`}
        >
          {type === 'auth' ? (
            <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
              <LoginPromptScreen isModal onClose={onClose} />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                  {type === 'profile' && (
                    <>
                      <User size={20} className="text-brand-primary" />
                      <span>{t.profileTitle}</span>
                    </>
                  )}
                  {type === 'settings' && (
                    <>
                      <Shield size={20} className="text-brand-primary" />
                      <span>{t.settingsTitle}</span>
                    </>
                  )}
                  {type === 'help' && (
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {type === 'profile' && <ProfileContent onClose={onClose} />}
                {type === 'settings' && <SettingsContent />}
                {type === 'help' && <HelpContent />}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
