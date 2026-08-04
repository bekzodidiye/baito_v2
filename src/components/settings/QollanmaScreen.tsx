import React from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, BookOpen, Search, UserCheck, Briefcase } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const QollanmaScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          onClick={() => setCurrentScreen('yordam')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2">
          Qo'llanma
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 max-w-4xl mx-auto w-full space-y-6">
        
        <div className="bg-brand-primary-container text-white p-6 rounded-3xl shadow-lg relative overflow-hidden mb-8">
          <div className="relative z-10">
            <h2 className="text-[20px] font-bold mb-2">Baito'ga xush kelibsiz!</h2>
            <p className="text-white/90 text-[14px]">
              Bu qisqacha qo'llanma orqali ilovadan qanday qilib to'g'ri foydalanishni bilib olishingiz mumkin.
            </p>
          </div>
          <BookOpen className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 pointer-events-none" />
        </div>

        <div className="space-y-6">
          <section className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-surface-lowest shadow-sm flex items-center justify-center shrink-0">
              <UserCheck className="text-brand-primary" size={24} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-brand-text mb-1">1. Profilingizni to'ldiring</h3>
              <p className="text-[14px] text-brand-text-variant leading-relaxed">
                Ish beruvchilar e'tiborini jalb qilish uchun shaxsiy ma'lumotlaringiz, ta'lim, ko'nikmalar va tajribalaringizni aniq ko'rsating.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-surface-lowest shadow-sm flex items-center justify-center shrink-0">
              <Search className="text-brand-primary" size={24} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-brand-text mb-1">2. Ish qidiring</h3>
              <p className="text-[14px] text-brand-text-variant leading-relaxed">
                Qidiruv oynasidan yoki maxsus filtrlardan foydalanib o'zingizga qulay grafikdagi va yo'nalishdagi ishlarni toping.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-surface-lowest shadow-sm flex items-center justify-center shrink-0">
              <Briefcase className="text-brand-primary" size={24} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-brand-text mb-1">3. Ariza topshiring</h3>
              <p className="text-[14px] text-brand-text-variant leading-relaxed">
                Mos keladigan ishni topgach "Ariza topshirish" tugmasini bosing va ish beruvchi javobini kuting. Natijalar xabarlar bo'limiga keladi.
              </p>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
};
