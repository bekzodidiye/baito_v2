import React from 'react';
import { BookOpen, AlertCircle, PhoneCall } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MODAL_TRANSLATIONS } from './MenuTranslations';

export const HelpContent: React.FC = () => {
  const { language } = useApp();
  const t = MODAL_TRANSLATIONS[language];

  return (
    <div className="space-y-5">
      {/* Help Lines */}
      <div className="space-y-3">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.faqTitle}</h5>
        
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <h6 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <BookOpen size={13} className="text-brand-primary" />
            <span>{t.q1}</span>
          </h6>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
            {t.a1}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <h6 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <BookOpen size={13} className="text-brand-primary" />
            <span>{t.q2}</span>
          </h6>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
            {t.a2}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <h6 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-brand-primary" />
            <span>{t.q3}</span>
          </h6>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
            {t.a3}
          </p>
        </div>
      </div>

      {/* Support Call */}
      <div className="bg-brand-surface-low p-4 rounded-xl border border-brand-outline-variant/60 flex flex-col gap-2.5 mt-2">
        <div className="flex items-center gap-2">
          <PhoneCall size={16} className="text-brand-primary" />
          <span className="text-xs font-bold text-slate-700">{t.supportCenter}</span>
        </div>
        <p className="text-[10px] text-brand-text-variant font-medium">
          {t.supportDesc}
        </p>
        <a href="tel:+998901234567" className="w-full py-2 bg-brand-primary text-white text-center rounded-lg text-xs font-bold hover:bg-brand-primary-hover active:scale-98 transition-all block">
          {t.contactBtn}
        </a>
      </div>
    </div>
  );
};
