import React from 'react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../Logo';
import { LANDING_TEXTS } from './LandingData';
import { ShieldCheck, Heart, Phone, Mail, MapPin } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAuthStore } from "../../store/useAuthStore";

interface LandingFooterProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;
    const requireAuth = useApp().requireAuth;

  return (
    <footer className="bg-slate-900 text-slate-300 font-sans pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Logo className="text-white" />
            <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-sm">
              {t.footerAbout}
            </p>
            <div className="flex items-center gap-2 text-xs font-extrabold text-sky-300">
              <ShieldCheck size={16} className="text-sky-400" />
              <span>{t.footerTrust}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{t.footerSections}</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-400">
              <li>
                <button onClick={() => setCurrentScreen('login')} className="hover:text-white transition-colors cursor-pointer">
                  {t.footerAllShifts}
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('login')} className="hover:text-white transition-colors cursor-pointer">
                  {t.footerMapView}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('worker')} className="hover:text-white transition-colors cursor-pointer">
                  {t.footerJoinWorker}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('employer')} className="hover:text-white transition-colors cursor-pointer">
                  {t.footerEmployerService}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{t.footerContact}</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-400">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-sky-400" />
                <span>+998 (71) 200-00-00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-sky-400" />
                <span>info@baito.uz</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-sky-400" />
                <span>Samarqand, O'zbekiston</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div>
            © {new Date().getFullYear()} {t.footerRights}
          </div>
          <div className="flex items-center gap-1">
            <span>{t.footerMadeIn}</span>
            <Heart size={13} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
