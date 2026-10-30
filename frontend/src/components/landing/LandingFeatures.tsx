import React from 'react';
import { CreditCard, ShieldCheck, MapPin, Clock, Award, Star, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { FEATURES_TEXTS } from './LandingFeatures.content';

/** Icon and colour per card; the copy lives in LandingFeatures.content.ts.
 *  The six cards were written out longhand and differed only in these two
 *  things and their text, which is how the text came to be untranslatable. */
const CARD_STYLE = [
  { Icon: CreditCard,    box: 'bg-emerald-50 text-emerald-600 border-emerald-200/80' },
  { Icon: ShieldCheck,   box: 'bg-blue-50 text-brand-primary border-blue-200/80' },
  { Icon: MapPin,        box: 'bg-sky-50 text-sky-600 border-sky-200/80' },
  { Icon: Clock,         box: 'bg-indigo-50 text-indigo-600 border-indigo-200/80' },
  { Icon: MessageCircle, box: 'bg-rose-50 text-rose-600 border-rose-200/80' },
  { Icon: Star,          box: 'bg-amber-50 text-amber-600 border-amber-200/80' },
];

export const LandingFeatures: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = FEATURES_TEXTS[language] || FEATURES_TEXTS.uz;

  return (
    <section id="features" className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans border-b border-slate-200/80 relative overflow-hidden select-none">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-sky-100/50 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-primary text-xs font-black shadow-2xs">
            <Award size={14} className="text-brand-primary" />
            <span>{t.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600">{t.subtitle}</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.cards.map((card, i) => {
            const { Icon, box } = CARD_STYLE[i];
            return (
              <div key={card.title} className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border group-hover:scale-105 transition-transform ${box}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-900">{card.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {card.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
