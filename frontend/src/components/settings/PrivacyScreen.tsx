import React, { useState } from 'react';
import { translations } from '../../translations';
import { PRIVACY, PrivacyBlock } from './PrivacyScreen.content';
import { ChevronDown, Check, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatLongDate } from '../../utils/dateFormat';
import { useAuthStore } from "../../store/useAuthStore";


/** The policy is held as data so the three languages stay parallel; this turns
 *  one section's blocks back into the markup they used to be written as. */
const Block: React.FC<{ block: PrivacyBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'h':
      return (
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">
          {block.text}
        </h4>
      );
    case 'p':
      return (
        <p className="text-[14px] text-brand-text-variant mb-3 leading-relaxed">{block.text}</p>
      );
    case 'ul':
      return (
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case 'note':
      return (
        <div className="bg-brand-primary-light/20 border-l-4 border-brand-primary p-3 rounded-r-md text-[13px] text-brand-text-variant mb-1">
          {block.lead && <strong className="text-brand-primary">{block.lead} </strong>}
          {block.text}
        </div>
      );
    case 'contacts':
      return (
        <ul className="list-disc pl-5 mb-1 text-[14px] text-brand-text-variant space-y-1">
          {block.items.map((item) => (
            <li key={item.label}>
              {item.label}{' '}
              {item.href
                ? <a href={item.href} className="text-brand-primary underline">{item.value}</a>
                : item.value}
            </li>
          ))}
        </ul>
      );
  }
};

interface PrivacyScreenProps {
  onBack?: () => void;
  onConfirm?: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack, onConfirm }) => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const doc = PRIVACY[language] || PRIVACY.uz;
  const navigate = useNavigate();
  
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [readSections, setReadSections] = useState<Set<number>>(new Set());
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>({});
  const [isSuccess, setIsSuccess] = useState(() => {
    if (onConfirm) return false;
    return localStorage.getItem('baito_privacy_consent') === 'true';
  });

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
    if (openSection !== idx && !readSections.has(idx)) {
      setReadSections(new Set(readSections).add(idx));
    }
  };

  const progress = Math.min(Math.round((readSections.size / doc.sections.length) * 100), 100);
  const allRead = readSections.size === doc.sections.length;
  // Counted from the policy rather than hardcoded: the gate has to track the
  // list it is gating, or a statement added in one language stops mattering.
  const allChecked =
    doc.consentChecks.every((_, i) => consentChecks[`c${i}`]);

  const toggleCheck = (id: string) => {
    setConsentChecks(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleConfirm = () => {
    setIsSuccess(true);
    localStorage.setItem('baito_privacy_consent', 'true');
    if (onConfirm) {
      // Small delay so user sees success state briefly if needed, or just immediately call it
      setTimeout(() => {
        onConfirm();
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          type="button"
          onClick={() => onBack ? onBack() : navigate(-1)}
          aria-label={t.goBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {doc.screenTitle}
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-12 px-4 max-w-2xl mx-auto w-full">
        
        {!isSuccess ? (
          <>
            <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-4 mb-4 shadow-3xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-brand-text-variant font-medium">{doc.readAllSections}</span>
                <strong className="text-[13px] text-brand-primary">{readSections.size} / {doc.sections.length}</strong>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-300 rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2.5 mb-6">
              {doc.sections.map((sec, idx) => (
                <div key={idx} className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs">
                  <button 
                    onClick={() => toggleSection(idx)}
                    className="w-full flex items-center p-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-[14px] text-brand-text flex-1 pr-2">
                      {sec.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mr-3 whitespace-nowrap ${readSections.has(idx) ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-slate-100 text-slate-500'}`}>
                      {readSections.has(idx) ? doc.read : doc.unread}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${openSection === idx ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {openSection === idx && (
                    <div className="p-4 border-t border-brand-outline-variant/30 bg-white">
                      {sec.blocks.map((block, bIdx) => <Block key={bIdx} block={block} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {allRead && (
              <div className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs mb-8" id="consent-wrap">
                <div className="bg-brand-primary p-4 text-center">
                  <h2 className="text-[15px] font-bold text-white mb-0.5">{doc.consentTitle}</h2>
                  <p className="text-[12px] text-white/80">{doc.consentSubtitle}</p>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-[13px] text-brand-text-variant bg-brand-primary/5 p-3 rounded-lg">
                    {doc.consentPreamble}
                  </p>
                  
                  <div className="space-y-3">
                    {doc.consentChecks.map((text, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-start pt-0.5">
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={!!consentChecks[`c${i}`]}
                            onChange={() => toggleCheck(`c${i}`)}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${consentChecks[`c${i}`] ? 'bg-brand-primary border-brand-primary text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                            {consentChecks[`c${i}`] && <Check size={14} className="stroke-[3]" />}
                          </div>
                        </div>
                        <span className="text-[13px] text-brand-text-variant leading-relaxed select-none group-hover:text-brand-text transition-colors">
                          {text}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button 
                    disabled={!allChecked}
                    onClick={handleConfirm}
                    className="w-full py-3.5 mt-4 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                  >
                    {doc.consentButton}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-8 text-center shadow-3xs mt-10">
            <div className="w-16 h-16 bg-[#EAF3DE] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-[#27500A]" />
            </div>
            <h2 className="text-[20px] font-bold text-brand-text mb-2">{doc.successTitle}</h2>
            <p className="text-[14px] text-brand-text-variant mb-6 max-w-sm mx-auto">
              {doc.successBody}
            </p>
            <p className="text-[12px] text-slate-400">
              {doc.confirmedOn} {formatLongDate(new Date(), language)}
            </p>
            <button 
              type="button"
              onClick={() => onBack ? onBack() : navigate(-1)}
              className="mt-6 px-6 py-2.5 bg-slate-100 text-brand-text font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              {doc.backButton}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
