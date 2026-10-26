import React, { useState, useMemo } from 'react';
import { translations } from '../../translations';
import { 
  ArrowLeft, 
  ChevronDown, 
  Search, 
  X, 
  HelpCircle, 
  UserCheck, 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  MessageSquare, 
  BookOpen 
} from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";
import { FAQ_CONTENT, FaqEntry } from './FaqScreen.content';

export const FaqScreen: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const { setCurrentScreen } = useCurrentScreen();
  
  const content = FAQ_CONTENT[language] ?? FAQ_CONTENT.uz;
  const { title, subtitle, searchPlaceholder, allCategories, filterGeneral, filterWorkers, filterEmployers, filterPayments, filterSecurity, needHelpTitle, needHelpDesc, liveChatButton, guideButton, noResultsFound, noResultsDesc, clearSearch, entries: faqs } = content;

  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'workers' | 'employers' | 'payments' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const categories = useMemo(() => [
    { id: 'all' as const, label: allCategories, icon: HelpCircle },
    { id: 'general' as const, label: filterGeneral, icon: HelpCircle },
    { id: 'workers' as const, label: filterWorkers, icon: UserCheck },
    { id: 'employers' as const, label: filterEmployers, icon: Building2 },
    { id: 'payments' as const, label: filterPayments, icon: CreditCard },
    { id: 'security' as const, label: filterSecurity, icon: ShieldCheck },
  ], [allCategories, filterGeneral, filterWorkers, filterEmployers, filterPayments, filterSecurity]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
    });
  }, [faqs, activeCategory, searchQuery]);

  const getCategoryBadge = (category?: FaqEntry['category']) => {
    switch (category) {
      case 'workers':
        return { label: filterWorkers, className: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' };
      case 'employers':
        return { label: filterEmployers, className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'payments':
        return { label: filterPayments, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'security':
        return { label: filterSecurity, className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'general':
      default:
        return { label: filterGeneral, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          type="button"
          onClick={() => setCurrentScreen('help')}
          aria-label={t.goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[17px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {title}
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      {/* Main Content */}
      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-14 px-4 md:px-10 max-w-4xl w-full mx-auto space-y-6">
        
        {/* Desktop Header */}
        <div className="hidden md:block">
          <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight mb-1">
            {title}
          </h1>
          <p className="text-[14px] text-slate-500 font-normal">
            {subtitle}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/90 rounded-2xl text-[14px] text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-3xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const badge = getCategoryBadge(faq.category);

              return (
                <div 
                  key={index} 
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs hover:shadow-xs transition-shadow duration-200 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-start justify-between p-5 text-left bg-white hover:bg-slate-50/70 transition-colors cursor-pointer gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug">
                        {faq.q}
                      </h3>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100/80 flex items-center justify-center shrink-0 text-slate-500 mt-1">
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} 
                      />
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-[14px] text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      <p className="pt-2">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-3xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search size={22} />
              </div>
              <h4 className="text-[16px] font-bold text-slate-800 mb-1">{noResultsFound}</h4>
              <p className="text-[13px] text-slate-500 mb-4 max-w-sm mx-auto">{noResultsDesc}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 bg-brand-primary text-white text-[13px] font-bold rounded-xl hover:bg-brand-primary/90 transition-colors cursor-pointer"
              >
                {clearSearch}
              </button>
            </div>
          )}
        </div>

        {/* Still Have Questions Footer Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-3xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 mb-1">
                {needHelpTitle}
              </h3>
              <p className="text-[13.5px] text-slate-600 max-w-md">
                {needHelpDesc}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('support-chat')}
                className="px-5 py-2.5 bg-brand-primary text-white text-[13px] font-bold rounded-xl hover:bg-brand-primary/90 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <MessageSquare size={16} />
                <span>{liveChatButton}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen('guide')}
                className="px-5 py-2.5 bg-slate-100 text-slate-800 text-[13px] font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <BookOpen size={16} />
                <span>{guideButton}</span>
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
