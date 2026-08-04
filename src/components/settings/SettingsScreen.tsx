import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';
import { ArrowLeft, Lock, Globe, Bell, Info, HelpCircle, ChevronRight, Trash2, Briefcase, MessageSquare } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const SettingsScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, setLanguage } = useApp();
  const t = translations[language];
  const tMenu = (t as any).menu || {};

  const [newJobsNotifications, setNewJobsNotifications] = useState(true);
  const [interviewNotifications, setInterviewNotifications] = useState(true);
  const [generalNotifications, setGeneralNotifications] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      {/* TopAppBar */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0">
        <button 
          onClick={() => setCurrentScreen('jobs')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2">
          {tMenu.settings || 'Sozlamalar'}
        </h1>
        <div className="w-10 h-10"></div> {/* Placeholder for balance */}
      </header>

      {/* Main Content Canvas */}
      <main className="md:pt-8 flex-1 overflow-y-auto pt-2 pb-6 px-5 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Account Section */}
        <section className="md:hidden">
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Hisob</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            <button 
              onClick={() => setCurrentScreen('security')}
              className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Lock size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Xavfsizlik</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Afzalliklar</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            
            <div className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group relative">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Globe size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Ilova tili</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-brand-text-variant font-medium">
                  {language === "uz" ? "O'zbek" : language === "ru" ? "Русский" : "English"}
                </span>
                <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="uz">O'zbek</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Bildirishnomalar</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            
            <button 
              className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100"
              onClick={() => setNewJobsNotifications(!newJobsNotifications)}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Briefcase size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Yangi ish joylari</p>
                  <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">Yangi bo'sh ish o'rinlari haqida</p>
                </div>
              </div>
              
              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${newJobsNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${newJobsNotifications ? 'right-1' : 'left-1'}`}></div>
              </div>
            </button>

            <button 
              className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100"
              onClick={() => setInterviewNotifications(!interviewNotifications)}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <MessageSquare size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Suhbat takliflari</p>
                  <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">Ish beruvchilardan takliflar</p>
                </div>
              </div>
              
              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${interviewNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${interviewNotifications ? 'right-1' : 'left-1'}`}></div>
              </div>
            </button>

            <button 
              className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group"
              onClick={() => setGeneralNotifications(!generalNotifications)}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Bell size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Umumiy xabarnomalar</p>
                  <p className="text-[13px] text-brand-text-variant mt-0.5 font-medium">Tizim va yangiliklar</p>
                </div>
              </div>
              
              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${generalNotifications ? 'bg-brand-primary' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-xs ${generalNotifications ? 'right-1' : 'left-1'}`}></div>
              </div>
            </button>
            
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Qo'shimcha</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            
            <div className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Info size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Ilova haqida</p>
                </div>
              </div>
              <span className="text-[14px] text-brand-text-variant font-medium">v1.0.2</span>
            </div>

            <button 
              onClick={() => setCurrentScreen('help')}
              className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group md:hidden"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <HelpCircle size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Yordam markazi</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </button>

          </div>
        </section>

      </main>
    </div>
  );
};
