import React, { useState } from 'react';
import { ChevronDown, Check, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    title: "Kirish va umumiy ma'lumot",
    content: (
      <>
        <p className="text-[14px] text-brand-text-variant mb-3 leading-relaxed">
          Baito platformasiga xush kelibsiz. Ushbu Maxfiylik Siyosati foydalanuvchilarning platformadan foydalanishi chog'ida to'planadigan shaxsiy ma'lumotlar bilan qanday munosabatda bo'lishimizni belgilaydi.
        </p>
        <p className="text-[14px] text-brand-text-variant mb-1 leading-relaxed">
          Platformamizdan foydalanish orqali siz ushbu siyosatni to'liq o'qib chiqqaningizni va shartlariga rozilik bildirginingizni tasdiqlaysiz. Agar siz ushbu shartlarga rozi bo'lmasangiz, iltimos, platformadan foydalanmang.
        </p>
      </>
    )
  },
  {
    title: "To'planadigan ma'lumotlar",
    content: (
      <>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Shaxsiy identifikatsiya</h4>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>To'liq ism va familiya</li>
          <li>Tug'ilgan sana va yosh</li>
          <li>Fuqarolik</li>
          <li>Pasport ma'lumotlari (seriya, raqam, amal qilish muddati)</li>
          <li>Elektron pochta manzili</li>
          <li>Telefon raqami</li>
          <li>Yashash manzili</li>
        </ul>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Kasbiy ma'lumotlar</h4>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>Ta'lim darajasi va o'quv yurtlari</li>
          <li>Ish tajribasi va ko'nikmalari</li>
          <li>Sertifikatlar va diplomlar</li>
          <li>Ko'zlangan ish sohalari va pozitsiyalar</li>
          <li>Ish vaqti imkoniyatlari</li>
        </ul>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Moliyaviy ma'lumotlar</h4>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>Bank hisobi ma'lumotlari (ish haqi o'tkazish uchun)</li>
          <li>Ish haqi tarixi va to'lovlar</li>
        </ul>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Texnik ma'lumotlar</h4>
        <ul className="list-disc pl-5 mb-1 text-[14px] text-brand-text-variant space-y-1">
          <li>IP manzil va qurilma identifikatori</li>
          <li>Brauzer turi va operatsion tizim</li>
          <li>Platformadagi faoliyat logi</li>
          <li>Joylashuv ma'lumotlari (ruxsat berilganda)</li>
        </ul>
      </>
    )
  },
  {
    title: "Ma'lumotlardan foydalanish maqsadlari",
    content: (
      <>
        <p className="text-[14px] text-brand-text-variant mb-2">To'plangan ma'lumotlar quyidagi maqsadlarda ishlatiladi:</p>
        <ul className="list-disc pl-5 mb-1 text-[14px] text-brand-text-variant space-y-1">
          <li>Platformada foydalanuvchi akkauntini yaratish va boshqarish</li>
          <li>Ish beruvchilar bilan moslashtirish (matching)</li>
          <li>Ish beruvchilarga nomzod profili taqdim etish</li>
          <li>Ish shartnomalarini rasmiylashtirish va yuridik hujjatlar</li>
          <li>Ish haqi va to'lovlarni amalga oshirish</li>
          <li>Platforma xavfsizligini ta'minlash va firibgarlikning oldini olish</li>
          <li>Qonuniy majburiyatlarni bajarish</li>
          <li>Platformani yaxshilash va foydalanuvchi tajribasini oshirish</li>
          <li>Muhim xabarlar va yangilanishlar haqida bildirishnomalar yuborish</li>
        </ul>
      </>
    )
  },
  {
    title: "Ma'lumotlarni uchinchi shaxslarga berish",
    content: (
      <>
        <h4 className="font-bold text-[13px] text-brand-text mb-1">Ish beruvchilar</h4>
        <p className="text-[14px] text-brand-text-variant mb-3">Siz murojaat qilgan ish beruvchilarga professional ma'lumotlaringiz taqdim etiladi. Bu xizmatning asosiy maqsadidir.</p>
        <h4 className="font-bold text-[13px] text-brand-text mb-1">Davlat organlari</h4>
        <p className="text-[14px] text-brand-text-variant mb-3">O'zbekiston qonunchiligida nazarda tutilgan hollarda (mehnat, soliq organlari) tegishli ma'lumotlar taqdim etilishi mumkin.</p>
        <h4 className="font-bold text-[13px] text-brand-text mb-1">Texnik hamkorlar</h4>
        <p className="text-[14px] text-brand-text-variant mb-3">Bulut xizmatlari, to'lov tizimlari kabi xizmat ko'rsatuvchilar cheklangan ma'lumotlarga ega bo'lishi mumkin.</p>
        <div className="bg-brand-primary-light/20 border-l-4 border-brand-primary p-3 rounded-r-md text-[13px] text-brand-text-variant">
          <strong className="text-brand-primary">Kafolat:</strong> Biz ma'lumotlaringizni tijorat maqsadida sotmaymiz va reklamachilar bilan baham ko'rmaymiz.
        </div>
      </>
    )
  },
  {
    title: "Ma'lumotlarni saqlash va xavfsizlik",
    content: (
      <>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Saqlash muddati</h4>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>Aktiv foydalanuvchi ma'lumotlari — akkaunt faol bo'lgan davr</li>
          <li>Ish tarixi va shartnomalar — 5 yil</li>
          <li>Moliyaviy hujjatlar — 7 yil (soliq qonunchiligiga muvofiq)</li>
          <li>Texnik loglar — 12 oy</li>
        </ul>
        <h4 className="font-bold text-[13px] text-brand-text mb-1 border-b border-brand-outline-variant/30 pb-1">Xavfsizlik choralari</h4>
        <ul className="list-disc pl-5 mb-1 text-[14px] text-brand-text-variant space-y-1">
          <li>SSL/TLS shifrlash barcha ma'lumot uzatish jarayonlarida</li>
          <li>AES-256 shifrlash bilan ma'lumotlar bazasida saqlash</li>
          <li>Ikki bosqichli autentifikatsiya (2FA) imkoniyati</li>
          <li>Muntazam xavfsizlik auditi</li>
          <li>Ma'lumotlarga kirish faqat vakolatli xodimlarga cheklangan</li>
        </ul>
      </>
    )
  },
  {
    title: "Foydalanuvchi huquqlari",
    content: (
      <>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>Ma'lumotlaringizga kirish va nusxa olish huquqi</li>
          <li>Noto'g'ri ma'lumotlarni tuzatishni talab qilish huquqi</li>
          <li>Ma'lumotlaringizni o'chirish ("unutilish huquqi") — qonuniy majburiyatlar bo'lmagan holda</li>
          <li>Ma'lumotlarni qayta ishlashni cheklash huquqi</li>
          <li>Reklama xabarlaridan voz kechish huquqi (har doim)</li>
          <li>Shikoyat bilan nazorat organiga murojaat qilish huquqi</li>
        </ul>
        <div className="bg-brand-primary-light/20 border-l-4 border-brand-primary p-3 rounded-r-md text-[13px] text-brand-text-variant">
          Huquqlaringizdan foydalanish uchun: <strong className="text-brand-primary">support@timee-uzb.uz</strong> — 30 kun ichida javob beramiz.
        </div>
      </>
    )
  },
  {
    title: "Cookie va kuzatish texnologiyalari",
    content: (
      <>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>Zaruriy cookie'lar — platformaning asosiy ishlashi uchun (o'chirib bo'lmaydi)</li>
          <li>Funksional cookie'lar — sizning sozlamalaringizni eslab qolish uchun</li>
          <li>Analitik cookie'lar — platformani yaxshilash uchun anonim statistika</li>
        </ul>
        <p className="text-[14px] text-brand-text-variant mb-1 leading-relaxed">
          Brauzer sozlamalaringiz orqali cookie'larni boshqarishingiz mumkin. Zaruriy cookie'larni o'chirganda platforma to'liq ishlamasligi mumkin.
        </p>
      </>
    )
  },
  {
    title: "Voyaga yetmaganlar maxfiyligi",
    content: (
      <p className="text-[14px] text-brand-text-variant mb-1 leading-relaxed">
        Baito xizmati faqat 18 yoshdan oshgan shaxslar uchun mo'ljallangan. Biz bilmagan holda voyaga yetmaganlarning ma'lumotlarini to'plasak, darhol o'chiramiz.
      </p>
    )
  },
  {
    title: "Siyosatga o'zgartirishlar",
    content: (
      <>
        <p className="text-[14px] text-brand-text-variant mb-3 leading-relaxed">
          Biz ushbu Maxfiylik Siyosatini vaqti-vaqti bilan yangilab turishimiz mumkin. Muhim o'zgarishlar bo'lganda sizga elektron pochta yoki platforma orqali kamida 30 kun oldin xabar beramiz. Yangilangan siyosat e'lon qilingan sanadan boshlab kuchga kiradi.
        </p>
        <p className="text-[14px] text-brand-text-variant mb-1 leading-relaxed">
          Xabardorlik qilingandan so'ng platformadan foydalanishni davom ettirsangiz, yangi siyosatga rozilik bildirgan hisoblanasiz.
        </p>
      </>
    )
  },
  {
    title: "Qo'llaniladigan qonunchilik",
    content: (
      <>
        <ul className="list-disc pl-5 mb-3 text-[14px] text-brand-text-variant space-y-1">
          <li>O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida"gi Qonuni (2019)</li>
          <li>O'zbekiston Respublikasining Mehnat Kodeksi</li>
          <li>O'zbekiston Respublikasining Fuqarolik Kodeksi</li>
        </ul>
        <p className="text-[14px] text-brand-text-variant mb-1 leading-relaxed">
          Nizolar O'zbekiston Respublikasi sudlarida ko'rib chiqiladi.
        </p>
      </>
    )
  },
  {
    title: "Aloqa va shikoyatlar",
    content: (
      <ul className="list-disc pl-5 mb-1 text-[14px] text-brand-text-variant space-y-1">
        <li>Elektron pochta: <a href="mailto:support@timee-uzb.uz" className="text-brand-primary underline">support@timee-uzb.uz</a></li>
        <li>Telegram: <a href="https://t.me/timee_uzb_support" className="text-brand-primary underline">@timee_uzb_support</a></li>
        <li>Javob vaqti: ish kunlarida 24 soat ichida</li>
      </ul>
    )
  }
];

interface PrivacyScreenProps {
  onBack?: () => void;
  onConfirm?: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack, onConfirm }) => {
  const navigate = useNavigate();
  
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [readSections, setReadSections] = useState<Set<number>>(new Set());
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>({});
  const [isSuccess, setIsSuccess] = useState(() => {
    if (onConfirm) return false;
    return localStorage.getItem('baito_privacy_consent') === 'true';
  });

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
    if (openSection !== idx && !readSections.has(idx)) {
      setReadSections(new Set(readSections).add(idx));
    }
  };

  const progress = Math.min(Math.round((readSections.size / SECTIONS.length) * 100), 100);
  const allRead = readSections.size === SECTIONS.length;
  const allChecked = Object.keys(consentChecks).length === 6 && Object.values(consentChecks).every(v => v);

  const toggleCheck = (id: string) => {
    setConsentChecks(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleConfirm = () => {
    setIsSuccess(true);
    localStorage.setItem('baito_privacy_consent', 'true');
    if (onConfirm) {
      // Small delay so user sees success state briefly if needed, or just immediately call it
      setTimeout(() => {
        onConfirm();
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-brand-surface">
      <header className="md:hidden flex justify-between items-center px-4 h-16 w-full z-50 bg-brand-surface/90 backdrop-blur-md sticky top-0 border-b border-brand-outline-variant/30">
        <button 
          type="button"
          onClick={() => onBack ? onBack() : navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors"
        >
          <ArrowLeft size={24} className="text-brand-text-variant" />
        </button>
        <h1 className="text-[18px] font-semibold text-brand-primary absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          Maxfiylik Siyosati
        </h1>
        <div className="w-10 h-10"></div>
      </header>

      <main className="md:pt-8 flex-1 overflow-y-auto pt-4 pb-12 px-4 max-w-2xl mx-auto w-full">
        
        {!isSuccess ? (
          <>
            <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-4 mb-4 shadow-3xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-brand-text-variant font-medium">Barcha bo'limlarni o'qing</span>
                <strong className="text-[13px] text-brand-primary">{readSections.size} / {SECTIONS.length}</strong>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-300 rounded-full" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2.5 mb-6">
              {SECTIONS.map((sec, idx) => (
                <div key={idx} className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs">
                  <button 
                    onClick={() => toggleSection(idx)}
                    className="w-full flex items-center p-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-[14px] text-brand-text flex-1 pr-2">
                      {sec.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mr-3 whitespace-nowrap ${readSections.has(idx) ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-slate-100 text-slate-500'}`}>
                      {readSections.has(idx) ? "O'qildi" : "O'qilmadi"}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${openSection === idx ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {openSection === idx && (
                    <div className="p-4 border-t border-brand-outline-variant/30 bg-white">
                      {sec.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {allRead && (
              <div className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden shadow-3xs mb-8" id="consent-wrap">
                <div className="bg-brand-primary p-4 text-center">
                  <h2 className="text-[15px] font-bold text-white mb-0.5">Rozilik bildirish</h2>
                  <p className="text-[12px] text-white/80">Barcha bo'limlarni o'qidingiz — endi rozilik bildiring</p>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-[13px] text-brand-text-variant bg-brand-primary/5 p-3 rounded-lg">
                    Men, quyidagi foydalanuvchi, Baito platformasining Maxfiylik Siyosatini to'liq o'qib chiqdim va quyidagilarni tasdiqlyman:
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      "Ushbu Maxfiylik Siyosatini to'liq o'qib chiqdim va tushundim.",
                      "Shaxsiy, kasbiy va moliyaviy ma'lumotlarimning yuqorida ko'rsatilgan maqsadlarda to'planishiga va qayta ishlanishiga roziman.",
                      "Ma'lumotlarimning ish beruvchilarga va qonunda ko'rsatilgan organlarga berilishiga roziman.",
                      "Roziligimni istalgan vaqt qaytarib olish huquqim borligini tushundim.",
                      "18 yoshga to'lganligimni va O'zbekiston fuqarosi ekanligimni tasdiqlayman.",
                      "Platforma foydalanish shartlari (Terms of Service) bilan tanishganligimni va ularga roziligimni bildiraman."
                    ].map((text, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-start pt-0.5">
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={!!consentChecks[`c${i}`]}
                            onChange={() => toggleCheck(`c${i}`)}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${consentChecks[`c${i}`] ? 'bg-brand-primary border-brand-primary text-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                            {consentChecks[`c${i}`] && <Check size={14} className="stroke-[3]" />}
                          </div>
                        </div>
                        <span className="text-[13px] text-brand-text-variant leading-relaxed select-none group-hover:text-brand-text transition-colors">
                          {text}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button 
                    disabled={!allChecked}
                    onClick={handleConfirm}
                    className="w-full py-3.5 mt-4 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                  >
                    Roziman va davom etaman
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-8 text-center shadow-3xs mt-10">
            <div className="w-16 h-16 bg-[#EAF3DE] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-[#27500A]" />
            </div>
            <h2 className="text-[20px] font-bold text-brand-text mb-2">Rozilik tasdiqlandi!</h2>
            <p className="text-[14px] text-brand-text-variant mb-6 max-w-sm mx-auto">
              Siz Baito maxfiylik siyosatini muvaffaqiyatli qabul qildingiz. Akkauntingiz to'liq faollashtirildi.
            </p>
            <p className="text-[12px] text-slate-400">
              Tasdiqlangan sana: {new Date().toLocaleDateString('uz-UZ', {year:'numeric',month:'long',day:'numeric'})}
            </p>
            <button 
              type="button"
              onClick={() => onBack ? onBack() : navigate(-1)}
              className="mt-6 px-6 py-2.5 bg-slate-100 text-brand-text font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Orqaga qaytish
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
