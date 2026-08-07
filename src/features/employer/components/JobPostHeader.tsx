import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';

interface JobPostHeaderProps {
  step: number;
  language: string;
  onBack: () => void;
}

export const JobPostHeader: React.FC<JobPostHeaderProps> = ({ step, language, onBack }) => {
  const steps = [
    { num: 1, label: language === 'uz' ? 'Asosiy' : language === 'ru' ? 'Основное' : 'Basic' },
    { num: 2, label: language === 'uz' ? 'Shartlar' : language === 'ru' ? 'Условия' : 'Terms' },
    { num: 3, label: language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Address' },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-100 shadow-xs mb-4">
      {/* Top Navbar */}
      <header className="px-4 h-16 max-w-4xl mx-auto flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-slate-900 text-lg">
          {language === 'uz' ? "Yangi e'lon yaratish" : language === 'ru' ? "Создание объявления" : "Create Job"}
        </h1>
        <div className="w-10" />
      </header>

      {/* Progress Stepper Container */}
      <div className="max-w-md mx-auto px-6 pb-5 pt-2">
        <div className="flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-[15%] right-[15%] h-[3px] bg-slate-200 rounded-full z-0">
            <div 
              className="h-full bg-brand-primary rounded-full transition-all duration-300"
              style={{ width: `${(step - 1) * 50}%` }}
            />
          </div>

          {/* Steps */}
          {steps.map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div key={s.num} className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-200 ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-brand-primary border-brand-primary text-white shadow-md ring-4 ring-brand-primary/15'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check size={16} className="stroke-[3]" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    isCurrent
                      ? 'text-brand-primary'
                      : isDone
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
