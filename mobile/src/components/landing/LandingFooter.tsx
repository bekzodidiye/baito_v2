import React from 'react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../Logo';
import { ShieldCheck, Heart, Send, Phone, Mail, MapPin } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface LandingFooterProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onSelectRole }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, requireAuth } = useApp();

  return (
    <footer className="bg-slate-900 text-slate-300 font-sans pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Logo className="text-white" />
            <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-sm">
              Baito — O'zbekistondagi tezkor soatbay smena va kunlik ishlar platformasi. Ishchilar va tashkilotlar uchun qulay hamda ishonchli xizmat.
            </p>
            <div className="flex items-center gap-2 text-xs font-extrabold text-sky-300">
              <ShieldCheck size={16} className="text-sky-400" />
              <span>Tasdiqlangan ID va Xavfsiz To'lovlar</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Bo'limlar</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-400">
              <li>
                <button onClick={() => setCurrentScreen('login')} className="hover:text-white transition-colors cursor-pointer">
                  Barcha Smenalar
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('login')} className="hover:text-white transition-colors cursor-pointer">
                  Xaritasimon Ko'rinish
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('worker')} className="hover:text-white transition-colors cursor-pointer">
                  Ishchi bo'lib kirish
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('employer')} className="hover:text-white transition-colors cursor-pointer">
                  Ish beruvchi xizmati
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Bog'lanish</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-400">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-sky-400" />
                <span>+998 (71) 200-00-00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-sky-400" />
                <span>support@baito.uz</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-sky-400" />
                <span>Toshkent sh., Chilonzor tumani</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div>
            © {new Date().getFullYear()} Baito Platformasi. Barcha huquqlar himoyalangan.
          </div>
          <div className="flex items-center gap-1">
            <span>O'zbekistonda tayyorlangan</span>
            <Heart size={13} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
