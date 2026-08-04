import React from 'react';
import { Mail, Phone, MapPin, Briefcase, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MODAL_TRANSLATIONS } from './MenuTranslations';
import { showToast } from '../../utils/toast';

interface ProfileContentProps {
  onClose: () => void;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({ onClose }) => {
  const { language, logout, } = useApp();
  const t = MODAL_TRANSLATIONS[language];

  return (
    <div className="space-y-6">
      {/* Avatar Card */}
      <div className="flex items-center gap-4 p-4 bg-brand-surface-low rounded-xl border border-brand-outline-variant/50">
        <div className="w-16 h-16 rounded-full bg-brand-primary/10 border-2 border-brand-primary/20 flex items-center justify-center font-display text-2xl font-black text-brand-primary select-none shrink-0">
          OS
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-base">Ozodbek Salimov</h4>
          <p className="text-xs text-brand-primary font-bold mt-0.5">{t.professional}</p>
          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-medium">
            <MapPin size={12} />
            <span>{language === 'ru' ? 'Ташкент, Узбекистан' : language === 'en' ? 'Tashkent, Uzbekistan' : "Toshkent, O'zbekiston"}</span>
          </div>
        </div>
      </div>

      {/* Info Rows */}
      <div className="space-y-3.5">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.personalInfo}</h5>
        
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
            <Mail size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Email</p>
            <p className="text-slate-700 font-medium mt-0.5">ozodbeksalimov989@gmail.com</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
            <Phone size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">{language === 'ru' ? 'Номер телефона' : language === 'en' ? 'Phone Number' : 'Telefon raqam'}</p>
            <p className="text-slate-700 font-medium mt-0.5">+998 (90) 123-45-67</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
            <Briefcase size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">{t.specialty}</p>
            <p className="text-slate-700 font-medium mt-0.5">{t.specialtyText}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-2xl font-black text-brand-primary">12</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{t.completedJobs}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-2xl font-black text-emerald-600">4.9 ★</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{t.rating}</p>
        </div>
      </div>

      {/* Log Out Button */}
      <button
        onClick={() => {
          logout();
          (t.logoutSuccess);
          setTimeout(() => {
            (null);
          }, 3000);
          onClose();
        }}
        className="w-full mt-4 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-rose-100 cursor-pointer shadow-3xs"
      >
        <LogOut size={14} className="stroke-[2.2]" />
        <span>{t.logout}</span>
      </button>
    </div>
  );
};
