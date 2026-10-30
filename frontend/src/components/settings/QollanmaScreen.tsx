import React, { useState, useMemo } from 'react';
import { translations } from '../../translations';
import { QOLLANMA, GuideStepItem } from './QollanmaScreen.content';
import { 
  ArrowLeft, 
  BookOpen, 
  Search, 
  UserCheck, 
  Briefcase, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Building2, 
  ChevronDown, 
  ArrowRight, 
  Lightbulb, 
  MessageCircle, 
  X,
  Star,
  HelpCircle
} from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";
import { ScreenType } from '../../context/types';

export const QollanmaScreen: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
  const g = QOLLANMA[language] || QOLLANMA.uz;
  const { setCurrentScreen } = useCurrentScreen();

  const [activeCategory, setActiveCategory] = useState<'all' | 'workers' | 'employers' | 'payments' | 'safety' | 'tips'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    'w-profile': true,
    'w-search': true,
    'w-apply': true,
    'e-profile': true,
    'e-post': true,
  });

  const toggleExpand = (id: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const categories = useMemo(() => [
    { id: 'all' as const, label: g.allCategories, icon: BookOpen },
    { id: 'workers' as const, label: g.filterWorkers, icon: UserCheck },
    { id: 'employers' as const, label: g.filterEmployers, icon: Building2 },
    { id: 'payments' as const, label: g.filterPayments, icon: CreditCard },
    { id: 'safety' as const, label: g.filterSafety, icon: ShieldCheck },
    { id: 'tips' as const, label: g.filterTips, icon: Lightbulb },
  ], [g]);

  const filteredSteps = useMemo(() => {
    return g.steps.filter(step => {
      const matchesCategory = activeCategory === 'all' || step.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = step.title.toLowerCase().includes(q);
      const matchDesc = step.description.toLowerCase().includes(q);
      const matchTip = step.tip ? step.tip.toLowerCase().includes(q) : false;
      const matchDetails = step.details.some(d => d.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchTip || matchDetails;
    });
  }, [g.steps, activeCategory, searchQuery]);

  const getStepIcon = (step: GuideStepItem) => {
    if (step.category === 'workers') {
      if (step.id === 'w-shift') return <Calendar size={22} className="text-brand-primary" />;
      if (step.id === 'w-payment') return <CreditCard size={22} className="text-emerald-600" />;
      if (step.id === 'w-review') return <Star size={22} className="text-amber-500 fill-amber-500/20" />;
      return <UserCheck size={22} className="text-brand-primary" />;
    }
    if (step.category === 'employers') {
      if (step.id === 'e-post') return <Briefcase size={22} className="text-indigo-600" />;
      if (step.id === 'e-finish') return <CreditCard size={22} className="text-emerald-600" />;
      return <Building2 size={22} className="text-indigo-600" />;
    }
    if (step.category === 'payments') {
      return <CreditCard size={22} className="text-emerald-600" />;
    }
    if (step.category === 'safety') {
      return <ShieldCheck size={22} className="text-rose-500" />;
    }
    return <HelpCircle size={22} className="text-brand-primary" />;
  };

  const getCategoryBadgeClass = (category: GuideStepItem['category']) => {
    switch (category) {
      case 'workers':
        return 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';
      case 'employers':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'payments':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'safety':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'tips':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleActionClick = (screen?: string) => {
    if (screen) {
      setCurrentScreen(screen as ScreenType);
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
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[17px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {g.title}
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      {/* Main Container */}
      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-14 px-4 md:px-10 max-w-4xl w-full mx-auto space-y-6">
        
        {/* Desktop Header */}
        <div className="hidden md:block">
          <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight mb-1">
            {g.title}
          </h1>
          <p className="text-[14px] text-slate-500 font-normal">
            {g.subtitle}
          </p>
        </div>

        {/* Hero Welcome Banner */}
        <div className="bg-gradient-to-br from-brand-primary to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[12px] font-semibold mb-3 backdrop-blur-sm border border-white/10">
              <BookOpen size={14} className="text-white/80" />
              <span>Baito Guide & Handbook</span>
            </div>
            <h2 className="text-[22px] sm:text-[24px] font-bold mb-2 tracking-tight">
              {g.welcomeTitle}
            </h2>
            <p className="text-white/85 text-[14px] leading-relaxed">
              {g.welcomeBody}
            </p>
          </div>
          <BookOpen className="absolute -bottom-6 -right-6 w-36 h-36 text-white/10 pointer-events-none transform rotate-12" />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={g.searchPlaceholder}
            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/90 rounded-2xl text-[14px] text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-3xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              aria-label={g.clearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="space-y-2">
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
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {filteredSteps.length > 0 ? (
            filteredSteps.map((step) => {
              const isExpanded = !!expandedSteps[step.id];
              return (
                <article
                  key={step.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs hover:shadow-xs transition-shadow duration-200"
                >
                  {/* Step Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs mt-0.5">
                      {getStepIcon(step)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {step.badge && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(step.category)}`}>
                            {step.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-snug">
                        {step.title}
                      </h3>

                      <p className="text-[14px] text-slate-600 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 pl-0 sm:pl-14">
                      {/* Bullet Details */}
                      {step.details.length > 0 && (
                        <ul className="space-y-2">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-[13.5px] text-slate-700 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Pro Tip Callout */}
                      {step.tip && (
                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5">
                          <Lightbulb size={18} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-[12.5px] text-amber-900 leading-relaxed">
                            <strong className="font-semibold text-amber-950 mr-1.5">{g.proTipLabel}</strong>
                            {step.tip}
                          </div>
                        </div>
                      )}

                      {/* Direct Action Link */}
                      {step.actionText && step.actionScreen && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleActionClick(step.actionScreen)}
                            className="inline-flex items-center gap-2 text-[13px] font-bold text-brand-primary hover:text-brand-primary/80 transition-colors group cursor-pointer"
                          >
                            <span>{step.actionText}</span>
                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Toggle Accordion Button */}
                  <div className="mt-3 pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleExpand(step.id)}
                      className="text-[12.5px] font-semibold text-slate-500 hover:text-brand-primary flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? g.collapseDetails : g.expandDetails}</span>
                      <ChevronDown size={15} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-3xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search size={22} />
              </div>
              <h4 className="text-[16px] font-bold text-slate-800 mb-1">{g.noResultsFound}</h4>
              <p className="text-[13px] text-slate-500 mb-4 max-w-sm mx-auto">{g.noResultsDesc}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 bg-brand-primary text-white text-[13px] font-bold rounded-xl hover:bg-brand-primary/90 transition-colors cursor-pointer"
              >
                {g.clearSearch}
              </button>
            </div>
          )}
        </div>

        {/* Need Help / Support Footer Banner */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-3xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 mb-1">
                {g.needHelpTitle}
              </h3>
              <p className="text-[13.5px] text-slate-600 max-w-md">
                {g.needHelpDesc}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('support-chat')}
                className="px-5 py-2.5 bg-brand-primary text-white text-[13px] font-bold rounded-xl hover:bg-brand-primary/90 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>{g.liveChatButton}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen('faq')}
                className="px-5 py-2.5 bg-slate-100 text-slate-800 text-[13px] font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle size={16} />
                <span>{g.faqButton}</span>
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
