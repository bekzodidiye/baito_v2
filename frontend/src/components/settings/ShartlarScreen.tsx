import React from 'react';
import { translations } from '../../translations';
import { TERMS } from './ShartlarScreen.content';
import { ArrowLeft } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";

export const ShartlarScreen: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const doc = TERMS[language] || TERMS.uz;
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          onClick={() => setCurrentScreen('help')}
          aria-label={t.goBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2">
          {doc.title}
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 md:px-10 max-w-4xl w-full">
        <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05)] p-6 md:p-8">
          <p className="text-[13px] text-brand-text-variant mb-6 font-medium">{doc.lastUpdated}</p>
          
          <div className="space-y-6 text-[14px] text-brand-text leading-relaxed">
            {doc.sections.map((sec) => (
              <section key={sec.heading}>
                <h2 className="text-[16px] font-bold text-brand-primary mb-2">{sec.heading}</h2>
                <p>{sec.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
