import React, { useState, useMemo } from 'react';
import { translations } from '../../translations';
import { TERMS, TermsSection } from './ShartlarScreen.content';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle, 
  Headphones, 
  FileText,
  ExternalLink,
  ChevronRight,
  Share2,
  Check
} from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from "../../store/useAuthStore";

export const ShartlarScreen: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const doc = TERMS[language] || TERMS.uz;
  const { setCurrentScreen } = useCurrentScreen();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return doc.sections;
    const q = searchQuery.toLowerCase().trim();
    return doc.sections.filter((sec) => {
      const inHeading = sec.heading.toLowerCase().includes(q);
      const inBody = sec.body.toLowerCase().includes(q);
      const inBullets = sec.bulletPoints?.some(b => b.toLowerCase().includes(q));
      const inNote = sec.note?.toLowerCase().includes(q);
      return inHeading || inBody || inBullets || inNote;
    });
  }, [doc.sections, searchQuery]);

  const handleBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen('help');
    } else {
      navigate(-1);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.dispatchEvent(
        new CustomEvent('global-toast', {
          detail: {
            message: language === 'uz' ? 'Havola nusxalandi' : language === 'ru' ? 'Ссылка скопирована' : 'Link copied',
            type: 'success',
          },
        })
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scrollToSection = (idx: number) => {
    const el = document.getElementById(`terms-sec-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30 print:hidden">
        <button 
          type="button"
          onClick={handleBack}
          aria-label={t.goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <ArrowLeft size={22} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[17px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {doc.title}
        </h1>
        <button
          type="button"
          onClick={handleShare}
          aria-label={doc.printDoc}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer text-slate-500"
        >
          {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-16 px-4 md:px-10 max-w-4xl w-full mx-auto space-y-6">
        
        {/* Desktop Header */}
        <div className="hidden md:flex items-start justify-between gap-4 pb-2 print:block">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <FileText size={13} />
                {doc.effectiveDate}
              </span>
            </div>
            <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight">
              {doc.title}
            </h1>
            <p className="text-[14px] text-slate-500 font-normal mt-1">
              {doc.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden pt-1">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-600 transition-colors shadow-3xs cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
              <span>{copied ? (language === 'uz' ? 'Nusxalandi' : language === 'ru' ? 'Скопировано' : 'Copied') : (language === 'uz' ? 'Ulashish' : language === 'ru' ? 'Поделиться' : 'Share')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-600 transition-colors shadow-3xs cursor-pointer"
            >
              <Printer size={15} />
              <span>{doc.printDoc}</span>
            </button>
          </div>
        </div>

        {/* Status Banner: Accepted & Active Terms (Locked / Read-only) */}
        <div className="bg-[#EAF3DE] border border-[#27500A]/20 rounded-2xl p-4 md:p-5 shadow-3xs flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#27500A]/15 text-[#27500A] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 size={24} className="stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-bold text-[#27500A]">
                {doc.statusAcceptedTitle}
              </h2>
              <span className="text-[11px] font-semibold text-[#27500A] bg-white/80 px-2.5 py-0.5 rounded-full border border-[#27500A]/10">
                {doc.statusAcceptedBadge}
              </span>
            </div>
            <p className="text-[12px] text-[#27500A]/90 mt-1 leading-relaxed">
              {doc.statusAcceptedSubtitle}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative print:hidden">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={doc.searchPlaceholder}
            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/90 rounded-2xl text-[14px] text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-3xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={doc.clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Navigation Anchor Chips */}
        {!searchQuery && (
          <div className="space-y-2 print:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              {doc.quickNav} ({doc.sections.length})
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {doc.sections.map((sec, idx) => {
                const shortLabel = sec.heading.split('.')[1]?.trim() || sec.heading;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToSection(idx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 whitespace-nowrap shadow-3xs cursor-pointer transition-all hover:border-brand-primary/40 active:scale-95"
                  >
                    <span className="w-4 h-4 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[150px]">{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Document Metadata Notice */}
        <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium px-1 print:border-b print:pb-2">
          <span>{doc.lastUpdated}</span>
          <span>{doc.allSections}: {filteredSections.length}</span>
        </div>

        {/* Empty Search Results */}
        {filteredSections.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-3xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3.5">
              <Search size={26} />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">
              {doc.noResults}
            </h3>
            <p className="text-[13px] text-slate-500 max-w-sm mx-auto mb-4">
              {doc.noResultsDesc}
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <X size={15} />
              <span>{doc.resetSearch}</span>
            </button>
          </div>
        )}

        {/* Sections List */}
        <div className="space-y-4">
          {filteredSections.map((sec, idx) => {
            const originalIndex = doc.sections.findIndex(s => s.heading === sec.heading);
            const sectionNumber = originalIndex !== -1 ? originalIndex + 1 : idx + 1;

            return (
              <section
                key={sec.heading}
                id={`terms-sec-${originalIndex}`}
                className="bg-brand-surface-lowest rounded-2xl border border-brand-outline-variant/40 p-5 md:p-7 shadow-3xs transition-shadow hover:shadow-2xs scroll-mt-20 print:border print:shadow-none print:break-inside-avoid"
              >
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary text-[12px] font-extrabold flex items-center justify-center shrink-0 mt-0.5 border border-brand-primary/15">
                    {sectionNumber}
                  </div>
                  <h2 className="text-[16px] md:text-[17px] font-bold text-brand-primary flex-1 tracking-tight">
                    {sec.heading}
                  </h2>
                </div>

                <p className="text-[14px] text-brand-text leading-relaxed pl-0 sm:pl-10 mb-3 font-normal">
                  {sec.body}
                </p>

                {/* Optional Bullet Points */}
                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="pl-0 sm:pl-10 space-y-2 mt-3 text-[13.5px] text-slate-600">
                    {sec.bulletPoints.map((bp, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0 mt-2" />
                        <span className="leading-relaxed">{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Optional Highlight Note */}
                {sec.note && (
                  <div className="mt-4 sm:ml-10 bg-amber-50/80 border-l-4 border-amber-500 p-3.5 rounded-r-xl text-[13px] text-amber-900 leading-relaxed font-medium">
                    {sec.note}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Related Legal & Support Footer Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-3xs space-y-4 print:hidden">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">
              {doc.relatedLinksTitle}
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {language === 'uz' 
                ? "Baito platformasidagi boshqa huquqiy hujjatlar va yordam kanallari" 
                : language === 'ru'
                  ? "Другие правовые документы и каналы помощи платформы Baito"
                  : "Other legal policies and help resources on the Baito platform"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setCurrentScreen('privacy')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck size={18} className="text-brand-primary shrink-0" />
                <span className="text-[13px] font-semibold text-slate-800 truncate">
                  {doc.privacyLink}
                </span>
              </div>
              <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('faq')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <HelpCircle size={18} className="text-indigo-600 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-800 truncate">
                  {doc.faqLink}
                </span>
              </div>
              <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('support-chat')}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Headphones size={18} className="text-emerald-600 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-800 truncate">
                  {doc.supportLink}
                </span>
              </div>
              <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};
