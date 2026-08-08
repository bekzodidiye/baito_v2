import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

const LANGUAGES = [
  { code: 'uz', name: "O'zbekcha", short: "O'zb", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', short: 'Рус', flag: '🇷🇺' },
  { code: 'en', name: 'English', short: 'Eng', flag: '🇺🇸' },
] as const;

export const LanguageSelector: React.FC<{ align?: 'left' | 'right' }> = ({ align = 'right' }) => {
  const { language, setLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative z-[60] inline-block text-left" data-allow-guest="true" data-language-selector="true">
      {/* Active Selection Button (Styled like the requested image) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-[11px] font-bold text-brand-primary bg-white hover:bg-slate-50/50 transition-all duration-200 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.01)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/10"
        type="button"
        id="language-selector-btn"
        data-allow-guest="true"
      >
        <Globe size={14} className="text-brand-primary shrink-0 stroke-[2.2]" />
        <span className="font-bold tracking-tight text-brand-primary pr-0.5 select-none font-sans leading-none mt-[1px]">
          {activeLang.short}
        </span>
        <ChevronDown 
          size={10} 
          className={`text-brand-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} shrink-0 stroke-[2.5]`} 
        />
      </button>

      {/* Floating Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 bg-white/95 backdrop-blur-md border border-slate-100 rounded-[14px] shadow-[0_12px_36px_rgba(0,0,0,0.12),_0_4px_16px_rgba(0,0,0,0.04)] p-1.5 w-36 origin-top-right ring-1 ring-black/5`}
          >
            {/* Dropdown Header */}
            <div className="px-2.5 py-2 text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-100/80 mb-1.5 select-none">
              {t.selectLanguage}
            </div>

            {/* Language Options */}
            <div className="flex flex-col gap-0.5">
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-2 text-left text-[11px] rounded-lg transition-all cursor-pointer border-0 bg-transparent ${
                      isSelected
                        ? 'bg-brand-primary/10 text-brand-primary font-bold shadow-3xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                    type="button"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[14px] select-none shrink-0 leading-none">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </span>
                    {isSelected && (
                      <Check size={12} className="text-brand-primary shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
