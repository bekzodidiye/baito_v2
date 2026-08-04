import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS, MOCK_LIVE_SHIFTS } from './LandingData';
import { Briefcase, Building2, Search, ArrowRight, Wallet, CheckCircle2, BadgeCheck, MapPin, Clock, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingHeroProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onSelectRole }) => {
  const { setCurrentScreen, language, isLoggedIn, jobs, requireAuth } = useApp();
  const [activeTab, setActiveTab] = useState<'worker' | 'employer'>('worker');
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftIndex, setShiftIndex] = useState(0);

  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const realShifts = useMemo(() => (jobs || []).map(j => ({
    id: j.id, titleUz: j.title, titleRu: j.title, company: j.company,
    district: j.location, pay: j.salary || "280,000 so'm/smena",
    time: j.time || "09:00 - 18:00 (8 soat)", badge: j.urgent ? 'Aktiv' : 'Aktiv',
    urgent: j.urgent || false,
    descriptionUz: j.description || "Ushbu smenada berilgan vazifalarni belgilangan vaqt va tartibga ko'ra mas'uliyat bilan bajarish talab etiladi.",
    descriptionRu: j.description || "Требуется ответственное выполнение поставленных задач в соответствии с регламентом и графиком смены.",
    perksUz: ["⚡ Kunlik to'lov", "🛡️ Baito Kafolati", "🍲 Tushlik"]
  })), [jobs]);

  const displayShifts = useMemo(() => {
    const list = [...realShifts, ...MOCK_LIVE_SHIFTS].slice(0, 6);
    return list.length > 0 ? list : MOCK_LIVE_SHIFTS;
  }, [realShifts]);

  const currentShift = displayShifts[shiftIndex % displayShifts.length] || displayShifts[0] || MOCK_LIVE_SHIFTS[0];

  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  useEffect(() => {
    if (displayShifts.length === 0) return;
    const timer = setInterval(() => {
      setShiftIndex(prev => (prev + 1) % displayShifts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [displayShifts.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'employer') {
      try { localStorage.setItem('baito_preselected_role', 'employer'); } catch(e){}
    } else {
      try { localStorage.setItem('baito_preselected_role', 'worker'); } catch(e){}
    }
    setCurrentScreen('login');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50/80 text-slate-900 font-sans py-12 lg:py-20 border-b border-slate-200/80 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Background photo - authentic active shift workforce atmosphere */}
        <img 
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80" 
          alt="Baito active daily shift work atmosphere" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-10 filter brightness-105 contrast-105 object-center mix-blend-multiply transition-all duration-500"
        />
        {/* Soft brand gradient overlays for seamless light theme blending */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/90 via-white/80 to-sky-50/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-50/90" />
        
        {/* Subtle geometric dot grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.25]" 
          style={{
            backgroundImage: `radial-gradient(#2563EB 0.75px, transparent 0.75px)`,
            backgroundSize: `24px 24px`
          }}
        />

        {/* Ambient glow halos */}
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-5 w-[400px] h-[400px] bg-sky-200/40 rounded-full blur-[120px] pointer-events-none" />
      </div>

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
                <Briefcase size={15} /><span>Ish izlovchi</span>
              </button>
              <button 
                onClick={() => setActiveTab('employer')} 
                data-allow-guest="true" 
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'employer' ? 'bg-brand-primary text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Building2 size={15} /><span>Ish beruvchi</span>
              </button>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-slate-900">
              {activeTab === 'worker' ? (
                <>Bugun ishlang, <br className="hidden sm:inline" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">bugunoq maosh oling!</span></>
              ) : (
                <>15 daqiqada ishonchli <br className="hidden sm:inline" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">xodimlarni yollang!</span></>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {activeTab === 'worker' 
                ? "Baito — uyingizga yaqin smenalarni topish, soatbay ishlash va smena oxirida kafolatlangan kunlik maosh olish xizmati." 
                : "Aktiv e'lon bering, nomzodlar bilan chat orqali muloqot qiling va tekshirilgan ID profilli xodimlarni zudlik bilan tanlang."}
            </p>

            {/* Search and Action Bar */}
            <div className="flex flex-col gap-3 max-w-xl mx-auto lg:mx-0">
              <form onSubmit={handleSearch} className="bg-white border border-slate-200/90 p-2 rounded-2xl shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-2" data-allow-guest="true">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl flex-1 border border-slate-200/80 text-slate-900 focus-within:border-brand-primary/60 transition-colors">
                  <Search size={19} className="text-brand-primary shrink-0" />
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    placeholder={activeTab === 'worker' ? "Kuryer, kassir, ofitsiant..." : "Aktiv lavozim qidirish..."} 
                    className="w-full text-xs sm:text-sm font-bold bg-transparent text-slate-900 focus:outline-none placeholder:text-slate-400" 
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
                  <span>{activeTab === 'worker' ? "Ishlarni ko'rish" : "E'lon berish"}</span><ArrowRight size={16} />
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
                  <span>Xaritadan izlash</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => { try { localStorage.setItem('baito_preselected_role', 'employer'); } catch(e){} setCurrentScreen('register'); }} 
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:text-brand-primary font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Building2 size={16} className="text-brand-primary" />
                  <span>Smena e'lon qilish (Yangi xodim yollash)</span>
                </button>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-extrabold text-slate-700 pt-1">
              <span className="flex items-center gap-1.5"><BadgeCheck size={17} className="text-blue-600 shrink-0" /> Tasdiqlangan ID</span>
              <span className="flex items-center gap-1.5"><Wallet size={17} className="text-blue-600 shrink-0" /> Bir zumda to'lov</span>
              <span className="flex items-center gap-1.5"><Percent size={17} className="text-blue-600 shrink-0" /> 0% komissiya</span>
            </div>
          </div>

          {/* Right Column - Shift Preview Card */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden text-slate-900 backdrop-blur-xl">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {language === 'ru' ? 'Свежие вакансии' : language === 'en' ? 'Active Daily Shifts' : 'Kunlik smenalar'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {displayShifts.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setShiftIndex(idx)} 
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${shiftIndex === idx ? 'w-6 bg-brand-primary' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                    />
                  ))}
                </div>
              </div>

              <div className="relative min-h-[350px]">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentShift.id || shiftIndex} 
                    initial={{ opacity: 0, y: 10, scale: 0.99 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: -10, scale: 0.99 }} 
                    transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }} 
                    className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm min-h-[350px] flex flex-col justify-between"
                  >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-brand-primary text-[10px] font-black uppercase border border-blue-200/80">
                        {currentShift.badge} • Kunlik smena
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        ⭐ 4.9 <span className="text-slate-400 font-normal">(120+)</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-snug">{language === 'ru' ? (currentShift as any).titleRu || currentShift.titleUz : currentShift.titleUz}</h3>
                      <p className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5 mt-1">
                        <Building2 size={14} className="text-brand-primary shrink-0" />
                        <span>{currentShift.company}</span>
                      </p>
                    </div>

                    <div className="text-base sm:text-lg font-black text-brand-primary pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                      <span>{currentShift.pay}</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">Kunlik to'lov</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 font-semibold pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <MapPin size={15} className="text-brand-primary shrink-0" />
                        <span className="leading-tight text-slate-800 font-bold">{currentShift.district}</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <Clock size={15} className="text-sky-600 shrink-0" />
                        <span className="leading-tight text-slate-800 font-bold">{currentShift.time}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {((currentShift as any).perksUz || ["⚡ Kunlik to'lov", "🛡️ Baito Kafolati", "🍲 Tushlik"]).map((perk: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">{perk}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => onSelectRole('worker')} className="w-full py-3 rounded-xl bg-brand-primary hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-blue-600/20">
                    <CheckCircle2 size={16} className="text-white shrink-0" />
                    <span>Ushbu smenaga ariza topshirish</span>
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

              <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs"><div className="text-xs font-black text-brand-primary">{t.stat1}</div><div className="text-[10px] font-bold text-slate-600">{t.stat1Label}</div></div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs"><div className="text-xs font-black text-emerald-600">{t.stat2}</div><div className="text-[10px] font-bold text-slate-600">{t.stat2Label}</div></div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs"><div className="text-xs font-black text-sky-600">{t.stat3}</div><div className="text-[10px] font-bold text-slate-600">{t.stat3Label}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
