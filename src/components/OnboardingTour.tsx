import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Search, Calendar, User, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OnboardingTour: React.FC = () => {
  const { hasSeenTour, setHasSeenTour, language } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  if (hasSeenTour) return null;

  const t = {
    skip: language === 'uz' ? "O'tkazib yuborish" : language === 'ru' ? "Пропустить" : "Skip",
    next: language === 'uz' ? "Keyingisi" : language === 'ru' ? "Далее" : "Next",
    start: language === 'uz' ? "Boshlash" : language === 'ru' ? "Начать" : "Start",
  };

  const steps = [
    {
      icon: Map,
      title: language === 'uz' ? "Xarita orqali ish qidiring" : language === 'ru' ? "Ищите работу на карте" : "Find jobs on the map",
      desc: language === 'uz' ? "O'zingizga yaqin hududdagi mos bo'sh ish o'rinlarini xaritadan to'g'ridan-to'g'ri toping." : language === 'ru' ? "Находите подходящие вакансии прямо на карте рядом с вами." : "Find suitable jobs right on the map near you.",
    },
    {
      icon: Search,
      title: language === 'uz' ? "Filtrlash imkoniyati" : language === 'ru' ? "Возможность фильтрации" : "Filtering options",
      desc: language === 'uz' ? "O'zingizga mos keladigan ishni tez va oson topish uchun maxsus filtrlardan foydalaning." : language === 'ru' ? "Используйте специальные фильтры, чтобы быстро и легко найти подходящую работу." : "Use special filters to quickly and easily find a job that suits you.",
    },
    {
      icon: Calendar,
      title: language === 'uz' ? "Kalendar orqali boshqaring" : language === 'ru' ? "Управляйте через календарь" : "Manage via calendar",
      desc: language === 'uz' ? "Barcha saqlangan va topshirilgan ishlaringizni kalendar yordamida qulay tarzda rejalashtiring." : language === 'ru' ? "Удобно планируйте все сохраненные и поданные заявки с помощью календаря." : "Conveniently plan all your saved and applied jobs using the calendar.",
    },
    {
      icon: User,
      title: language === 'uz' ? "Shaxsiy profil va chat" : language === 'ru' ? "Личный профиль и чат" : "Personal profile and chat",
      desc: language === 'uz' ? "Profilni to'ldirib ko'proq ishlarga ega bo'ling va to'g'ridan-to'g'ri ish beruvchi bilan chatda gaplashing." : language === 'ru' ? "Заполните профиль, чтобы получать больше предложений, и общайтесь напрямую с работодателем в чате." : "Fill out your profile to get more job offers and talk directly with the employer in the chat.",
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setHasSeenTour(true);
    }
  };

  const handleSkip = () => {
    setHasSeenTour(true);
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] relative"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-primary/5 to-transparent z-0 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl z-0 pointer-events-none" />
        <div className="absolute top-12 -left-12 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl z-0 pointer-events-none" />

        <button 
          onClick={handleSkip}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-slate-100 text-slate-500 rounded-full transition-colors z-10 shadow-sm"
        >
          <X size={18} />
        </button>

        <div className="p-8 pt-12 pb-6 flex flex-col items-center text-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center w-full"
            >
              {/* Enhanced Icon Container */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-primary/15 rounded-[28px] rotate-6 scale-105 transition-transform" />
                <div className="relative w-28 h-28 bg-gradient-to-br from-brand-primary/5 to-white border border-white/60 rounded-[28px] shadow-xl shadow-brand-primary/10 flex items-center justify-center backdrop-blur-sm">
                  <CurrentIcon className="text-brand-primary w-12 h-12 drop-shadow-sm" strokeWidth={1.5} />
                </div>
              </div>

              <h2 className="text-[22px] font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                {steps[currentStep].title}
              </h2>
              <p className="text-[15px] text-slate-500 leading-relaxed max-w-[280px]">
                {steps[currentStep].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-8 pb-8 pt-2 w-full flex flex-col items-center relative z-10">
          {/* Progress Dots */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  currentStep === idx ? 'w-8 bg-brand-primary' : 'w-2 bg-slate-200'
                }`} 
              />
            ))}
          </div>

          <div className="flex flex-col w-full gap-3">
            <button 
              onClick={handleNext}
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white text-[15px] font-bold py-4 px-6 rounded-2xl transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              {currentStep === steps.length - 1 ? t.start : t.next}
              {currentStep !== steps.length - 1 && (
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              )}
            </button>
            <button 
              onClick={handleSkip}
              className="w-full text-[14px] font-semibold text-slate-400 hover:text-slate-600 transition-colors py-3 px-4 rounded-xl hover:bg-slate-50"
            >
              {t.skip}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
