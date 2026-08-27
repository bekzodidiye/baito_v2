import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { Job } from '../../types';

interface LandingHeroShiftPreviewProps {
  displayShifts: any[];
  language: string;
  onSelectRole: (role: 'worker' | 'employer') => void;
  isLoading?: boolean;
  t: any;
}

export const LandingHeroShiftPreview: React.FC<LandingHeroShiftPreviewProps> = ({ 
  displayShifts, 
  language, 
  onSelectRole,
  isLoading,
  t
}) => {
  const [shiftIndex, setShiftIndex] = useState(0);

  useEffect(() => {
    if (displayShifts.length === 0) return;
    const timer = setInterval(() => {
      setShiftIndex(prev => (prev + 1) % displayShifts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [displayShifts.length]);

  const currentShift = displayShifts.length > 0 ? displayShifts[shiftIndex % displayShifts.length] : null;

  return (
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
            {isLoading ? (
              <motion.div 
                key="loading" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm min-h-[350px] flex flex-col justify-between animate-pulse"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-24 bg-slate-200 rounded-md"></div>
                    <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                  </div>
                  <div>
                    <div className="h-6 w-3/4 bg-slate-200 rounded-md mb-2"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                    <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
                    <div className="h-5 w-20 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-200/60">
                    <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
                    <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5 flex gap-1.5">
                     <div className="h-5 w-16 bg-slate-200 rounded-md"></div>
                     <div className="h-5 w-20 bg-slate-200 rounded-md"></div>
                     <div className="h-5 w-14 bg-slate-200 rounded-md"></div>
                  </div>
                </div>
                <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
              </motion.div>
            ) : currentShift ? (
              <motion.div 
                key={currentShift.id || shiftIndex} 
                initial={{ opacity: 0, y: 10, scale: 0.99 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -10, scale: 0.99 }} 
                className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm min-h-[350px] flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-brand-primary text-[10px] font-black uppercase border border-blue-200/80">
                      {currentShift.badge || 'Smena'} • Kunlik smena
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      ⭐ 4.9 <span className="text-slate-400 font-normal">(120+)</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {language === 'ru' ? (currentShift.titleRu || currentShift.titleUz || currentShift.title) : (currentShift.titleUz || currentShift.title)}
                    </h3>
                    <p className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5 mt-1">
                      <Building2 size={14} className="text-brand-primary shrink-0" />
                      <span>{currentShift.company}</span>
                    </p>
                  </div>

                  <div className="text-base sm:text-lg font-black text-brand-primary pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                    <span>{currentShift.pay || currentShift.salary}</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">Kunlik to'lov</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 font-semibold pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <MapPin size={15} className="text-brand-primary shrink-0" />
                      <span className="leading-tight text-slate-800 font-bold">{currentShift.district || currentShift.location}</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <Clock size={15} className="text-sky-600 shrink-0" />
                      <span className="leading-tight text-slate-800 font-bold">{currentShift.time}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(currentShift.perksUz || ["⚡ Kunlik to'lov", "🛡️ Baito Kafolati", "🍲 Tushlik"]).map((perk: string, i: number) => (
                        <span key={i} className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => onSelectRole('worker')} className="w-full py-3 rounded-xl bg-brand-primary hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-blue-600/20">
                  <CheckCircle2 size={16} className="text-white shrink-0" />
                  <span>Ushbu smenaga ariza topshirish</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="empty" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm min-h-[350px] flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                  <Clock size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-700">Hozircha faol smenalar yo'q</h3>
                <p className="text-xs font-bold text-slate-500 max-w-[200px]">
                  Yangi ish o'rinlari tez orada qo'shiladi.
                </p>
                <button onClick={() => onSelectRole('employer')} className="mt-4 px-6 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-primary text-slate-700 hover:text-brand-primary text-xs font-black transition-all cursor-pointer shadow-sm">
                  Birinchi bo'lib e'lon bering
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="text-xs font-black text-brand-primary">{t.stat1}</div>
            <div className="text-[10px] font-bold text-slate-600">{t.stat1Label}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="text-xs font-black text-emerald-600">{t.stat2}</div>
            <div className="text-[10px] font-bold text-slate-600">{t.stat2Label}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="text-xs font-black text-sky-600">{t.stat3}</div>
            <div className="text-[10px] font-bold text-slate-600">{t.stat3Label}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
