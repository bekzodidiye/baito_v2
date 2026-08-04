import React from 'react';
import { CreditCard, ShieldCheck, MapPin, Clock, Award, Star, MessageSquare } from 'lucide-react';

export const LandingFeatures: React.FC = () => {
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
            <span>Afzalliklar va Texnologiya</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Nima uchun minglab insonlar Baito'ni tanlaydi?</h2>
          <p className="text-sm sm:text-base font-semibold text-slate-600">Kunlik to'lovlar, xavfsiz ID tizimi va jonli geolokatsiya imkoniyatlari</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 group-hover:scale-105 transition-transform">
              <CreditCard size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Smena yakunida instant to'lov</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Ish beruvchi ishni qabul qilishi bilan maosh summasi bank kartangizga 1 daqiqa ichida o'tkaziladi.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-primary flex items-center justify-center border border-blue-200/80 group-hover:scale-105 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Tasdiqlangan ID Profil va Reyting</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Barcha foydalanuvchilar pasport verification bosqichidan o'tadi va ikki tomonlama reytingga ega bo'ladi.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200/80 group-hover:scale-105 transition-transform">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Jonli Geolokatsiya va Xarita</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Uyingiz va tumaningizdan qancha uzoqlikda ish joyi borligini real vaqt rejimida xaritadan ko'ring.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/80 group-hover:scale-105 transition-transform">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Moslashuvchan Grafik va Soatbay</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              O'zingizga qulay kunda, istalgan soatda ishlash imkoniyati — to'liq erkinlik.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/80 group-hover:scale-105 transition-transform">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Integratsiyalangan Ichki Chat</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              O'zaro savollar, tafsilotlar va joylashuv haqida bevosita muloqot qilish.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80 group-hover:scale-105 transition-transform">
              <Star size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Kafolatlangan Bepul E'lonlar</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Ish beruvchilar uchun dastlabki 3 ta e'lon va ariza qabul qilish mutlaqo bepul.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
