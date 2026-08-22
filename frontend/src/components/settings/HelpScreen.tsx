import React from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, HelpCircle, FileText, MessageCircle, Phone, ChevronRight, Mail } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const HelpScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      {/* TopAppBar */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          onClick={() => setCurrentScreen('settings')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2">
          Yordam markazi
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      {/* Main Content */}
      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Contact Support */}
        <section>
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Biz bilan bog'lanish</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            
            <a href="tel:+998901234567" className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Phone size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Telefon orqali</p>
                  <p className="text-[13px] text-brand-text-variant font-medium">+998 90 123 45 67</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </a>

            <a href="mailto:support@baito.uz" className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <Mail size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Elektron pochta</p>
                  <p className="text-[13px] text-brand-text-variant font-medium">support@baito.uz</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </a>

            <button onClick={() => setCurrentScreen('support-chat')} className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <MessageCircle size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Jonli chat</p>
                  <p className="text-[13px] text-brand-text-variant font-medium">Operatorlar bilan suhbat</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </button>
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-[12px] text-brand-primary mb-3 px-2 uppercase tracking-wider font-bold">Foydali manbalar</h2>
          <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05),0_1px_3px_rgba(0,6,102,0.02)] overflow-hidden">
            
            <button onClick={() => setCurrentScreen('faq')} className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <HelpCircle size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Ko'p so'raladigan savollar</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </button>

            <button onClick={() => setCurrentScreen('guide')} className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <FileText size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Qo'llanma</p>
                </div>
              </div>
              <ChevronRight size={22} className="text-brand-text-variant group-hover:text-brand-primary transition-colors" />
            </button>
            
            <button onClick={() => setCurrentScreen('terms')} className="w-full flex items-center justify-between p-5 bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors text-left group">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white text-brand-primary border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary group-hover:scale-105 transition-all duration-200">
                  <FileText size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-brand-text">Xizmat ko'rsatish shartlari</p>
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
