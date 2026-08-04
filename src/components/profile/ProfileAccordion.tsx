import React from 'react';
import { Briefcase, ChevronRight, History, MessageSquare, Award, Coins, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../utils/toast';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface ProfileAccordionProps {
  expandedSection: 'activity' | 'settings' | 'help' | null;
  setExpandedSection: (sec: 'activity' | 'settings' | 'help' | null) => void;
  t: any;
  language: string;
  setCurrentScreen: (screen: string) => void;

  setActiveDialog: (dialog: 'withdraw' | 'edit' | 'none') => void;
  toggleLanguage: () => void;
}

export const ProfileAccordion: React.FC<ProfileAccordionProps> = ({
  expandedSection,
  setExpandedSection,
  t,
  language,
  setCurrentScreen,
  setActiveDialog,
  toggleLanguage,
}) => {
  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* 1. Ish Faoliyati Accordion */}
      
      {/* 2. Sozlamalar Accordion (Direct Link) */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-3xs">
        <button 
          onClick={() => { setCurrentScreen('sozlamalar'); (null); }}
          className="w-full flex items-center justify-between p-4.5 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span className="font-display font-black text-xs text-slate-800 uppercase tracking-wider">{language === 'uz' ? 'Sozlamalar' : language === 'ru' ? 'Настройки' : "Settings"}</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>
      
      {/* 3. Yordam Accordion (Direct Link) */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-3xs">
        <button 
          onClick={() => { setCurrentScreen('yordam'); (null); }}
          className="w-full flex items-center justify-between p-4.5 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span className="font-display font-black text-xs text-slate-800 uppercase tracking-wider">{language === 'uz' ? 'Yordam' : language === 'ru' ? 'Помощь' : "Help"}</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-3xs">
        <button 
          onClick={() => setExpandedSection(expandedSection === 'activity' ? null : 'activity')}
          className="w-full flex items-center justify-between p-4.5 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-brand-primary stroke-[2.2]" />
            <span className="font-display font-black text-xs text-slate-800 uppercase tracking-wider">{t.activitySec}</span>
          </div>
          <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedSection === 'activity' ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {expandedSection === 'activity' && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden bg-white border-t border-slate-100"
            >
              <div className="divide-y divide-slate-100">
                <div 
                  onClick={() => { setCurrentScreen('kalendar'); (null); }}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <History size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{t.pastJobs}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-350" />
                </div>

                <div 
                  onClick={() => {
                    showToast(language === 'uz' ? "Hozircha reytinglar yo'q." : language === 'ru' ? "Пока отзывов нет." : "No reviews yet.");
                  }}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{t.reviews}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-350" />
                </div>

                <div 
                  onClick={() => {
                    showToast(language === 'uz' ? "Nishonlar: Yangi foydalanuvchi, Doimiy xodim." : language === 'ru' ? "Значки: Новый пользователь, Постоянный сотрудник." : "Badges: New User, Loyal Worker.");
                  }}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Award size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{t.badgesList}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-350" />
                </div>

                <div 
                  onClick={() => setActiveDialog('withdraw')}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Coins size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{t.earnings}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-350" />
                </div>

                <div 
                  onClick={() => {
                    showToast(language === 'uz' ? "Hujjatlar yuklanmoqda..." : language === 'ru' ? "Загрузка налоговых документов..." : "Loading tax documents...");
                  }}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">{t.taxes}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-350" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
