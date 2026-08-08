import React from 'react';
import { Star } from 'lucide-react';

interface CalendarLegendProps {
  language: 'uz' | 'ru' | 'en';
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({ language }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold">
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1px_1.5px_rgba(146,64,14,0.4),_0_1.5px_3.5px_rgba(245,158,11,0.3)] shrink-0 select-none" />
        <span className="text-slate-600">
          {language === 'ru' ? 'В заявках' : language === 'en' ? 'Applied' : 'Arizada'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1px_1.5px_rgba(6,95,70,0.4),_0_1.5px_3.5px_rgba(16,185,129,0.3)] shrink-0 select-none" />
        <span className="text-slate-600">
          {language === 'ru' ? 'Подтверждено' : language === 'en' ? 'Confirmed' : 'Tasdiqlangan'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),_inset_0_-1px_1.5px_rgba(159,18,57,0.4),_0_1.5px_3.5px_rgba(244,63,94,0.3)] shrink-0 select-none" />
        <span className="text-slate-600">
          {language === 'ru' ? 'К выполнению' : language === 'en' ? 'To Do' : 'Qilinadigan ish'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none">
          <Star 
            size={16} 
            className="fill-brand-primary text-brand-primary"
            style={{ filter: 'url(#star-3d)' }}
          />
        </div>
        <span className="text-slate-600">
          {language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Tugallangan'}
        </span>
      </div>
    </div>
  );
};
