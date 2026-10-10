import React from 'react';
import { LANDING_TEXTS } from './LandingData';
import { TESTIMONIALS } from './LandingTestimonials.content';
import { Star, Quote, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from "../../store/useAuthStore";

export const LandingTestimonials: React.FC = () => {
  const language = useAuthStore(s => s.language);
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const reviews = (TESTIMONIALS[language as keyof typeof TESTIMONIALS] || TESTIMONIALS.uz)
    .map(r => ({ ...r, rating: 5 }));

  return (
    <section className="py-12 lg:py-16 bg-slate-50 font-sans border-b border-slate-200 min-h-[calc(100vh-4.5rem)] sm:min-h-[calc(100vh-5rem)] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black">
            <Quote size={14} />
            <span>{t.reviewsBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{t.reviewsTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">{t.reviewsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{rev.date}</span>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                  "{rev.text}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-sm shrink-0">
                  {rev.name[0]}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <span>{rev.name}</span>
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">{rev.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
