import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../Logo';
import { LanguageSelector } from '../LanguageSelector';
import { ArrowRight, Menu, X, UserCheck, Building2, Sparkles } from 'lucide-react';

interface LandingNavbarProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onSelectRole }) => {
  const { setCurrentScreen, language, isLoggedIn, userProfile, requireAuth } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleExploreJobs = () => {
    setMobileMenuOpen(false);
    setCurrentScreen('login');
  };

  const isUz = language === 'uz';
  const isRu = language === 'ru';

  const navs = {
    features: isUz ? "Xususiyatlar" : isRu ? "Возможности" : "Features",
    categories: isUz ? "Yo'nalishlar" : isRu ? "Категории" : "Categories",
    map: isUz ? "Xarita" : isRu ? "Интерактивная карта" : "Map",
    roles: isUz ? "Kimlar uchun?" : isRu ? "Для кого" : "Roles",
    faq: isUz ? "Savollar" : isRu ? "Вопросы" : "FAQ",
    login: isUz ? "Kirish" : isRu ? "Войти" : "Log in",
    registerWorker: isUz ? "Ishchi bo'lish" : isRu ? "Стать рабочим" : "Join as Worker",
    exploreJobs: isUz ? "E'lonlar" : isRu ? "Вакансии" : "Jobs",
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs font-sans transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Logo />
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-bold text-slate-600" data-allow-guest="true">
          <button onClick={() => scrollToSection('features')} className="hover:text-brand-primary transition-colors cursor-pointer" data-allow-guest="true">
            {navs.features}
          </button>
          <button onClick={() => scrollToSection('categories')} className="hover:text-brand-primary transition-colors cursor-pointer" data-allow-guest="true">
            {navs.categories}
          </button>
          <button onClick={() => scrollToSection('map-preview')} className="hover:text-brand-primary transition-colors cursor-pointer" data-allow-guest="true">
            {navs.map}
          </button>
          <button onClick={() => scrollToSection('roles')} className="hover:text-brand-primary transition-colors cursor-pointer" data-allow-guest="true">
            {navs.roles}
          </button>
          <button onClick={() => scrollToSection('faq')} className="hover:text-brand-primary transition-colors cursor-pointer" data-allow-guest="true">
            {navs.faq}
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector />
          
          <button
            onClick={handleExploreJobs}
            className="px-3.5 py-2 rounded-xl text-slate-700 hover:text-brand-primary hover:bg-slate-100/80 font-extrabold text-xs transition-all cursor-pointer"
          >
            {navs.exploreJobs}
          </button>

          <button
            onClick={() => setCurrentScreen('login')}
            className="px-4 py-2.5 rounded-xl text-brand-primary hover:bg-brand-primary/5 font-black text-xs border border-brand-primary/25 transition-all cursor-pointer"
          >
            {navs.login}
          </button>

          <button
            onClick={() => {
              try { localStorage.setItem('baito_preselected_role', 'worker'); } catch(e){}
              setCurrentScreen('register');
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-primary text-white font-black text-xs hover:bg-brand-primary/95 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{navs.registerWorker}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2" data-allow-guest="true">
          <LanguageSelector />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
            data-allow-guest="true"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-xl" data-allow-guest="true">
          <div className="flex flex-col space-y-1" data-allow-guest="true">
            <button onClick={() => scrollToSection('features')} className="text-left px-3 py-2 text-slate-700 font-extrabold text-sm hover:bg-slate-50 rounded-xl" data-allow-guest="true">
              {navs.features}
            </button>
            <button onClick={() => scrollToSection('categories')} className="text-left px-3 py-2 text-slate-700 font-extrabold text-sm hover:bg-slate-50 rounded-xl" data-allow-guest="true">
              {navs.categories}
            </button>
            <button onClick={() => scrollToSection('map-preview')} className="text-left px-3 py-2 text-slate-700 font-extrabold text-sm hover:bg-slate-50 rounded-xl" data-allow-guest="true">
              {navs.map}
            </button>
            <button onClick={() => scrollToSection('roles')} className="text-left px-3 py-2 text-slate-700 font-extrabold text-sm hover:bg-slate-50 rounded-xl" data-allow-guest="true">
              {navs.roles}
            </button>
            <button onClick={() => scrollToSection('faq')} className="text-left px-3 py-2 text-slate-700 font-extrabold text-sm hover:bg-slate-50 rounded-xl" data-allow-guest="true">
              {navs.faq}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              onClick={handleExploreJobs}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs text-center"
            >
              {navs.exploreJobs}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onSelectRole('worker'); }}
                className="py-3 rounded-xl bg-brand-primary text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                <UserCheck size={15} />
                <span>Ishchiman</span>
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onSelectRole('employer'); }}
                className="py-3 rounded-xl bg-brand-secondary text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                <Building2 size={15} />
                <span>Ish beruvchiman</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
