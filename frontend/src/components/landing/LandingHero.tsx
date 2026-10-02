import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useJobsData } from "../../context/useJobsData";
import { LANDING_TEXTS } from './LandingData';
import { Briefcase, Building2, Search, ArrowRight, Wallet, CheckCircle2, BadgeCheck, MapPin, Clock, Percent } from 'lucide-react';
import { LandingHeroBackground } from './LandingHeroBackground';
import { LandingHeroShiftPreview } from './LandingHeroShiftPreview';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";

interface LandingHeroProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const requireAuth = useApp().requireAuth;
  const { jobs, isLoading } = useJobsData();
  const [activeTab, setActiveTab] = useState<'worker' | 'employer'>('worker');
  const [searchQuery, setSearchQuery] = useState('');

  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const realShifts = useMemo(() => (jobs || []).map(j => ({
    id: j.id, titleUz: j.title, titleRu: j.title, company: j.company,
    district: j.location, pay: j.salary || "280,000 so'm/smena",
    // The hour count reads in the visitor's language; the badge comes from the
    // table now, so "Aktiv" is not hardcoded twice over for both branches.
    time: j.time || `09:00 - 18:00 (8 ${t.hoursSuffix})`, badge: t.statusActive,
    urgent: j.urgent || false,
    descriptionUz: j.description || "Ushbu smenada berilgan vazifalarni belgilangan vaqt va tartibga ko'ra mas'uliyat bilan bajarish talab etiladi.",
    descriptionRu: j.description || "Требуется ответственное выполнение поставленных задач в соответствии с регламентом и графиком смены.",
  })), [jobs, language]);

  const displayShifts = useMemo(() => {
    if (!searchQuery.trim()) {
      return realShifts.slice(0, 6);
    }
    const q = searchQuery.toLowerCase().trim();
    return realShifts.filter(j => 
      j.titleUz.toLowerCase().includes(q) || 
      j.titleRu.toLowerCase().includes(q) || 
      j.company.toLowerCase().includes(q) ||
      j.district.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [realShifts, searchQuery]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'employer') {
      try { localStorage.setItem('baito_preselected_role', 'employer'); } catch (e) { }
      setCurrentScreen('login');
    } else {
      try { localStorage.setItem('baito_preselected_role', 'worker'); } catch (e) { }
      const mapSection = document.getElementById('map-preview');
      if (mapSection) {
        const yOffset = -80;
        const y = mapSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50/80 text-slate-900 font-sans py-12 lg:py-20 border-b border-slate-200/80 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <LandingHeroBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Role Switcher Toggle */}
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-md backdrop-blur-md" data-allow-guest="true">
              <button
                onClick={() => setActiveTab('worker')}
                data-allow-guest="true"
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'worker' ? 'bg-brand-primary text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Briefcase size={15} /><span>{t.heroTabWorker}</span>
              </button>
              <button
                onClick={() => setActiveTab('employer')}
                data-allow-guest="true"
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'employer' ? 'bg-brand-primary text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Building2 size={15} /><span>{t.heroTabEmployer}</span>
              </button>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-slate-900">
              {activeTab === 'worker' ? (
                <>{t.heroTitleWorkerA} <br className="hidden sm:inline" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">{t.heroTitleWorkerB}</span></>
              ) : (
                <>{t.heroTitleEmployerA} <br className="hidden sm:inline" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">{t.heroTitleEmployerB}</span></>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {activeTab === 'worker'
                ? t.heroSubWorker
                : t.heroSubEmployer}
            </p>

            {/* Search and Action Bar */}
            <div className="flex flex-col gap-3 max-w-xl mx-auto lg:mx-0">
              <form onSubmit={handleSearch} className="bg-white border border-slate-200/90 p-2 rounded-2xl shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-2" data-allow-guest="true">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl flex-1 border border-slate-200/80 text-slate-900 focus-within:border-brand-primary/60 transition-colors">
                  <Search size={19} className="text-brand-primary shrink-0" />
                  <input
              aria-label={t.heroSearchLabel}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'worker' ? t.heroSearchPlaceholderWorker : t.heroSearchPlaceholderEmployer}
                    className="w-full text-xs sm:text-sm font-bold bg-transparent text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  data-allow-guest="true"
                  onClick={(e) => {
                    e.preventDefault();
                    if (activeTab === 'worker') {
                      const mapSection = document.getElementById('map-preview');
                      if (mapSection) {
                        const yOffset = -80;
                        const y = mapSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    } else {
                      handleSearch(e);
                    }
                  }}
                  className="px-6 py-3.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 bg-brand-primary hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 active:scale-[0.98]"
                >
                  <span>{activeTab === 'worker' ? t.heroSubmitWorker : t.heroSubmitEmployer}</span><ArrowRight size={16} />
                </button>
              </form>

              {activeTab === 'worker' ? (
                <button
                  type="button"
                  data-allow-guest="true"
                  onClick={() => {
                    const mapSection = document.getElementById('map-preview');
                    if (mapSection) {
                      const yOffset = -80;
                      const y = mapSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:text-brand-primary font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <MapPin size={16} className="text-brand-primary" />
                  <span>{t.heroMapBtn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { try { localStorage.setItem('baito_preselected_role', 'employer'); } catch (e) { } setCurrentScreen('register'); }}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:text-brand-primary font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Building2 size={16} className="text-brand-primary" />
                  <span>{t.heroPostShiftBtn}</span>
                </button>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-extrabold text-slate-700 pt-1">
              <span className="flex items-center gap-1.5"><BadgeCheck size={17} className="text-blue-600 shrink-0" /> {t.heroBadgeId}</span>
              <span className="flex items-center gap-1.5"><Wallet size={17} className="text-blue-600 shrink-0" /> {t.heroBadgeInstantPay}</span>
              {/* Sat outside the activeTab switch, so an employer was told they
                  pay no commission — true of a worker, who receives the posted
                  wage in full, and not of an employer, who pays the category's
                  rate plus the region's on top of it. */}
              <span className="flex items-center gap-1.5">
                <Percent size={17} className="text-blue-600 shrink-0" />
                {activeTab === 'worker'
                  ? (language === 'ru' ? '0% комиссии' : language === 'en' ? 'No commission' : "0% komissiya")
                  : (language === 'ru' ? 'Комиссия сверх оплаты' : language === 'en' ? 'Commission on top of the wage' : "Komissiya ish haqi ustiga")}
              </span>
            </div>
          </div>

          <LandingHeroShiftPreview
            displayShifts={displayShifts}
            isLoading={isLoading}
            language={language}
            onSelectRole={onSelectRole}
            t={t}
          />
        </div>
      </div>
    </section>
  );
};
