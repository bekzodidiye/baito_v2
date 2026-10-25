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
  
  // Is consent already granted and confirmed?
  const [isConsentGiven, setIsConsentGiven] = useState(() => {
    if (onConfirm) return false;
    return localStorage.getItem('baito_privacy_consent') === 'true';
  });

  // If consent is already given, all sections are considered read
  const [readSections, setReadSections] = useState<Set<number>>(() => {
    if (!onConfirm && localStorage.getItem('baito_privacy_consent') === 'true') {
      return new Set(doc.sections.map((_, i) => i));
    }
    return new Set();
  });

  // If consent is already given, all consent checks are checked
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>(() => {
    if (!onConfirm && localStorage.getItem('baito_privacy_consent') === 'true') {
      const all: Record<string, boolean> = {};
      doc.consentChecks.forEach((_, i) => {
        all[`c${i}`] = true;
      });
      return all;
    }
    return {};
  });

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
    if (openSection !== idx && !readSections.has(idx)) {
      setReadSections(new Set(readSections).add(idx));
    }
  };

  const isAllRead = isConsentGiven || readSections.size >= doc.sections.length;
  const effectiveReadCount = isConsentGiven ? doc.sections.length : readSections.size;
  const progress = Math.min(Math.round((effectiveReadCount / doc.sections.length) * 100), 100);

  const allChecked =
    isConsentGiven || doc.consentChecks.every((_, i) => consentChecks[`c${i}`]);

  const toggleCheck = (id: string) => {
    // If consent is already permanently confirmed, it cannot be changed ("lekin ozgartira olmasin")
    if (isConsentGiven) return;
    setConsentChecks(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleConfirm = () => {
    setIsConsentGiven(true);
    localStorage.setItem('baito_privacy_consent', 'true');
    setReadSections(new Set(doc.sections.map((_, i) => i)));
    const all: Record<string, boolean> = {};
    doc.consentChecks.forEach((_, i) => {
      all[`c${i}`] = true;
    });
    setConsentChecks(all);
    if (onConfirm) {
      setTimeout(() => {
        onConfirm();
      }, 500);
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

      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-12 px-4 md:px-10 max-w-4xl w-full">
        {/* If already confirmed, show the verified badge banner */}
        {isConsentGiven && (
          <div className="bg-[#EAF3DE] border border-[#27500A]/20 rounded-xl p-4 mb-5 shadow-3xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#27500A]/15 text-[#27500A] flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-[#27500A]">
                  {language === 'uz'
                    ? "Maxfiylik siyosatiga to'liq rozilik berilgan"
                    : language === 'ru'
                      ? "Полное согласие с политикой конфиденциальности подтверждено"
                      : "Full consent to privacy policy confirmed"}
                </h3>
                <span className="text-[11px] font-semibold text-[#27500A] bg-white/80 px-2.5 py-0.5 rounded-full border border-[#27500A]/10">
                  {doc.confirmedOn} {formatLongDate(new Date(), language)}
                </span>
              </div>
              <p className="text-[12px] text-[#27500A]/90 mt-1 leading-relaxed">
                {language === 'uz'
                  ? "Barcha bo'limlar to'liq o'qilgan va tasdiqlangan. Shartlar faol hisoblanadi va o'zgartirib bo'lmaydi."
                  : language === 'ru'
                    ? "Все разделы полностью прочитаны и подтверждены. Условия действуют и изменению не подлежат."
                    : "All sections fully read and confirmed. Terms are active and cannot be modified."}
              </p>
            </div>
          </div>
        )}

        {/* Reading progress bar */}
        <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-4 mb-4 shadow-3xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] text-brand-text-variant font-medium">
              {isConsentGiven
                ? (language === 'uz' ? "Barcha bo'limlar to'liq o'qilgan" : language === 'ru' ? "Все разделы полностью прочитаны" : "All sections fully read")
                : doc.readAllSections}
            </span>
            <strong className="text-[13px] text-brand-primary">{effectiveReadCount} / {doc.sections.length}</strong>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${isConsentGiven ? 'bg-emerald-600' : 'bg-brand-primary'}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        {/* Policy Sections List */}
        <div className="space-y-2.5 mb-6">
          {doc.sections.map((sec, idx) => {
            const isSectionRead = isConsentGiven || readSections.has(idx);
            return (
              <div key={idx} className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs">
                <button 
                  type="button"
                  onClick={() => toggleSection(idx)}
                  className="w-full flex items-center p-3.5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 ${isSectionRead ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-primary/10 text-brand-primary'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-[14px] text-brand-text flex-1 pr-2">
                    {sec.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full mr-3 whitespace-nowrap font-medium ${isSectionRead ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-slate-100 text-slate-500'}`}>
                    {isSectionRead ? doc.read : doc.unread}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${openSection === idx ? 'rotate-180' : ''}`} />
                </button>
                
                {openSection === idx && (
                  <div className="p-4 border-t border-brand-outline-variant/30 bg-white">
                    {sec.blocks.map((block, bIdx) => <Block key={bIdx} block={block} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consent Block */}
        {isAllRead && (
          <div className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs mb-8" id="consent-wrap">
            <div className={`${isConsentGiven ? 'bg-slate-800' : 'bg-brand-primary'} p-4 text-center transition-colors`}>
              <h2 className="text-[15px] font-bold text-white mb-0.5">
                {isConsentGiven
                  ? (language === 'uz' ? 'Maxfiylik siyosatiga berilgan rozilik' : language === 'ru' ? 'Предоставленное согласие' : 'Granted consent')
                  : doc.consentTitle}
              </h2>
              <p className="text-[12px] text-white/80">
                {isConsentGiven
                  ? (language === 'uz' ? "Quyidagi barcha bandlarga to'liq rozilik tasdiqlangan" : language === 'ru' ? 'Полное согласие по всем пунктам подтверждено' : 'Full consent confirmed for all items below')
                  : doc.consentSubtitle}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[13px] text-brand-text-variant bg-slate-50 p-3 rounded-lg border border-slate-100">
                {doc.consentPreamble}
              </p>
              
              <div className="space-y-3">
                {doc.consentChecks.map((text, i) => {
                  const isChecked = isConsentGiven || !!consentChecks[`c${i}`];
                  return (
                    <label 
                      key={i} 
                      className={`flex items-start gap-3 select-none ${isConsentGiven ? 'cursor-default' : 'cursor-pointer group'}`}
                    >
                      <div className="relative flex items-start pt-0.5">
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isChecked}
                          disabled={isConsentGiven}
                          onChange={() => toggleCheck(`c${i}`)}
                        />
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isChecked 
                            ? (isConsentGiven ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-brand-primary border-brand-primary text-white')
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}>
                          {isChecked && <Check size={14} className="stroke-[3]" />}
                        </div>
                      </div>
                      <span className={`text-[13px] leading-relaxed transition-colors ${isConsentGiven ? 'text-slate-700 font-medium' : 'text-brand-text-variant group-hover:text-brand-text'}`}>
                        {text}
                      </span>
                    </label>
                  );
                })}
              </div>

              {isConsentGiven ? (
                <div className="w-full py-3.5 mt-4 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 select-none shadow-xs">
                  <CheckCircle2 size={18} className="stroke-[2.5]" />
                  <span>
                    {language === 'uz'
                      ? "Rozilik to'liq berilgan (O'zgartirib bo'lmaydi)"
                      : language === 'ru'
                        ? "Согласие полностью предоставлено (Нельзя изменить)"
                        : "Consent fully granted (Cannot be changed)"}
                  </span>
                </div>
              ) : (
                <button 
                  type="button"
                  disabled={!allChecked}
                  onClick={handleConfirm}
                  className="w-full py-3.5 mt-4 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {doc.consentButton}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
