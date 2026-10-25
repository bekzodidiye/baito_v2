import React, { useState } from 'react';
import { translations } from '../../translations';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";
import { FAQ_CONTENT } from './FaqScreen.content';

export const FaqScreen: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const { title, entries: faqs } = FAQ_CONTENT[language] ?? FAQ_CONTENT.uz;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      {/* TopAppBar */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          onClick={() => setCurrentScreen('help')}
          aria-label={t.goBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2">
          {title}
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 md:px-10 max-w-4xl w-full space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-brand-surface-lowest rounded-2xl shadow-[0_4px_20px_rgba(0,6,102,0.05)] overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-5 text-left bg-brand-surface-lowest hover:bg-brand-surface-low transition-colors"
            >
              <h3 className="text-[15px] font-bold text-brand-text pr-4 leading-snug">
                {faq.q}
              </h3>
              {openIndex === index ? (
                <ChevronUp className="text-brand-primary shrink-0" size={20} />
              ) : (
                <ChevronDown className="text-brand-text-variant shrink-0" size={20} />
              )}
            </button>
            
            {openIndex === index && (
              <div className="px-5 pb-5 pt-1 text-[14px] text-brand-text-variant leading-relaxed">
                <div className="w-full h-px bg-brand-outline-variant/20 mb-4"></div>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
};
