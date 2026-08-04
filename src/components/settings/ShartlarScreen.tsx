import React from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft } from 'lucide-react';

export const ShartlarScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

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
          Xizmat shartlari
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-6 pb-12 px-5 max-w-4xl mx-auto w-full">
        <div className="bg-brand-surface-lowest rounded-3xl shadow-[0_4px_20px_rgba(0,6,102,0.05)] p-6 md:p-8">
          <p className="text-[13px] text-brand-text-variant mb-6 font-medium">Oxirgi yangilanish: 15-Oktabr, 2023</p>
          
          <div className="space-y-6 text-[14px] text-brand-text leading-relaxed">
            <section>
              <h2 className="text-[16px] font-bold text-brand-primary mb-2">1. Umumiy qoidalar</h2>
              <p>
                Ushbu xizmat ko'rsatish shartlari ("Shartlar") Baito ilovasidan ("Ilova") foydalanish tartibini belgilaydi. Ilovadan foydalanish orqali siz ushbu shartlarga rozi bo'lgan hisoblanasiz.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-bold text-brand-primary mb-2">2. Hisob va Xavfsizlik</h2>
              <p>
                Foydalanuvchi ilovada ro'yxatdan o'tish paytida taqdim etgan ma'lumotlarning to'g'riligiga javobgardir. Shaxsiy hisob va parolni sir saqlash foydalanuvchining shaxsiy mas'uliyati hisoblanadi.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-bold text-brand-primary mb-2">3. Ma'lumotlar Maxfiyligi</h2>
              <p>
                Biz sizning shaxsiy ma'lumotlaringizni himoya qilishga va faqat ishga joylashish jarayonlarini osonlashtirish uchun foydalanishga kafolat beramiz. Ma'lumotlaringiz uchinchi shaxslarga sotilmaydi.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-bold text-brand-primary mb-2">4. Javobgarlikni cheklash</h2>
              <p>
                Baito faqat ish beruvchi va ish qidiruvchini bog'lovchi platforma bo'lib, tomonlar o'rtasidagi kelishuvlar, ish haqini to'lash yoki ish sharoitlari bo'yicha javobgarlikni o'z zimmasiga olmaydi.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
