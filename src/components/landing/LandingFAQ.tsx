import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS, FAQ_ITEMS } from './LandingData';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LandingFAQ: React.FC = () => {
  const { language } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const toggleFAQ = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-12 lg:py-16 bg-white font-sans border-b border-slate-200 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">
            <HelpCircle size={14} />
            <span>Savollar va Javoblar</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{t.faqTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">Baito platformasi bo'yicha eng muhim savollarga ochiq javoblar</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const q = language === 'ru' ? item.qRu : item.qUz;
            const a = language === 'ru' ? item.aRu : item.aUz;
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="bg-slate-50 rounded-2xl border border-slate-200/90 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                >
                  <span className="text-sm font-black text-slate-900">{q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-xs font-medium text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                        {a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
