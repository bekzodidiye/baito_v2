import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LANDING_TEXTS } from './LandingData';
import { Calculator, DollarSign, Calendar, Clock, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface LandingIncomeCalculatorProps {
  onSelectRole: (role: 'worker' | 'employer') => void;
}

export const LandingIncomeCalculator: React.FC<LandingIncomeCalculatorProps> = ({ onSelectRole }) => {
  const { language } = useApp();
  const t = LANDING_TEXTS[language as keyof typeof LANDING_TEXTS] || LANDING_TEXTS.uz;

  const [hourlyRate, setHourlyRate] = useState<number>(35000); // 35,000 so'm/soat
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);

  const categories = [
    { name: 'Kuryerlik', rate: 35000 },
    { name: 'Restoran / Kafe', rate: 30000 },
    { name: 'Omborxona', rate: 38000 },
    { name: 'Qurilish', rate: 45000 },
    { name: 'Savdo', rate: 28000 },
  ];

  const dailyIncome = hourlyRate * hoursPerDay;
  const weeklyIncome = dailyIncome * daysPerWeek;
  const monthlyIncome = weeklyIncome * 4;

  const formatSum = (val: number) => {
    return val.toLocaleString('uz-UZ') + " so'm";
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-white via-slate-50/80 to-slate-100/60 text-slate-900 font-sans relative overflow-hidden select-none border-b border-slate-200/80">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/4 left-10 w-[450px] h-[450px] bg-blue-100/50 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-sky-100/60 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-primary text-xs font-black shadow-2xs">
            <Calculator size={14} className="text-brand-primary" />
            <span>Interactive Kalkulyator</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{t.calcTitle}</h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600">{t.calcSubtitle}</p>
        </div>

        {/* Calculator Widget Box */}
        <div className="max-w-4xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-6">
            {/* Category Select */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Soha toifasini tanlang:</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setHourlyRate(cat.rate)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      hourlyRate === cat.rate
                        ? 'bg-brand-primary text-white shadow-md shadow-blue-600/25 scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-extrabold">
                <span className="text-slate-700 flex items-center gap-1.5"><Clock size={15} className="text-brand-primary" /> Kunlik ish vaqti:</span>
                <span className="text-brand-primary font-black text-sm">{hoursPerDay} soat / kun</span>
              </div>
              <input
                type="range"
                min="4"
                max="12"
                step="1"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-brand-primary cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Days Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-extrabold">
                <span className="text-slate-700 flex items-center gap-1.5"><Calendar size={15} className="text-sky-600" /> Haftalik ish kunlari:</span>
                <span className="text-sky-600 font-black text-sm">{daysPerWeek} kun / hafta</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Results Display */}
          <div className="md:col-span-5 bg-gradient-to-br from-blue-900 via-[#0D1B54] to-[#060D2E] border border-blue-900/60 rounded-2xl p-6 text-center space-y-4 shadow-xl text-white">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-200/90">Taxminiy Oylik Daromad</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1 drop-shadow-sm">
                {formatSum(monthlyIncome)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-blue-500/30 text-left">
              <div className="p-2.5 rounded-xl bg-[#040A26] border border-blue-500/25">
                <span className="text-[10px] font-bold text-slate-300 block">Kunlik maosh</span>
                <span className="text-xs font-black text-emerald-400">{formatSum(dailyIncome)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#040A26] border border-blue-500/25">
                <span className="text-[10px] font-bold text-slate-300 block">Haftalik maosh</span>
                <span className="text-xs font-black text-sky-300">{formatSum(weeklyIncome)}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectRole('worker')}
              className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-blue-600 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98]"
            >
              <span>Ushbu daromadni topishni boshlash</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
