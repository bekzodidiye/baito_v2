import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { ArrowLeft, Briefcase, MapPin, Building, Users, Calendar as CalendarIcon, Clock, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JobPostFormProps {
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export const JobPostForm: React.FC<JobPostFormProps> = ({ onBack, onSubmitSuccess }) => {
  const { postNewJob, language } = useEmployer();
  
  const [step, setStep] = useState(1);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('retail');
  const [description, setDescription] = useState('');
  const [neededWorkers, setNeededWorkers] = useState('1');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [hourlyRate, setHourlyRate] = useState('');
  const [transportRate, setTransportRate] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Toshkent');

  const categories = [
    { id: 'retail', label: language === 'uz' ? 'Chakana savdo' : language === 'ru' ? 'Розничная торговля' : "Retail" },
    { id: 'office', label: language === 'uz' ? 'Ofis / Ma\'muriy' : language === 'ru' ? 'Офис / Администрация' : "Office / Admin" },
    { id: 'service', label: language === 'uz' ? 'Xizmat ko\'rsatish' : language === 'ru' ? 'Обслуживание' : "Services" },
    { id: 'manufacturing', label: language === 'uz' ? 'Ishlab chiqarish' : language === 'ru' ? 'Производство' : "Manufacturing" },
    { id: 'food', label: language === 'uz' ? 'Oziq-ovqat / Restoran' : language === 'ru' ? 'Рестораны / Питание' : "Restaurants / Food" },
  ];

  const handleNext = () => {
    if (step === 1) {
      if (!title || !category || !description) {
        alert(language === 'uz' ? "Barcha majburiy maydonlarni to'ldiring" : language === 'ru' ? "Заполните все обязательные поля" : "Fill in all required fields");
        return;
      }
    } else if (step === 2) {
      if (!date || !startTime || !endTime || !hourlyRate || !neededWorkers) {
        alert(language === 'uz' ? "Barcha majburiy maydonlarni to'ldiring" : language === 'ru' ? "Заполните все обязательные поля" : "Fill in all required fields");
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    if (!addressLine || !city) {
      alert(language === 'uz' ? "Manzilni kiriting" : language === 'ru' ? "Введите адрес" : "Enter address");
      return;
    }

    const newJob = {
      title,
      description,
      location: `${city}, ${addressLine}`,
      salary: hourlyRate.toString(), // We used hourlyRate for total salary
      durationLabel: date || '1 kunlik', // We used date for duration
    };

    postNewJob(newJob);
    onSubmitSuccess();
  };

  return (
    <div className="flex flex-col min-h-screen md:min-h-[calc(100vh-80px)] bg-slate-50 relative pt-0 pb-24 md:pb-6">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-16 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors -ml-2 text-slate-600 outline-none cursor-pointer border-none bg-transparent"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-slate-800 text-lg">
          {language === 'uz' ? "Yangi e'lon yaratish" : language === 'ru' ? "Создание объявления" : "Create Job"}
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 md:p-8 no-scrollbar">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === i 
                  ? 'bg-brand-primary border-brand-primary text-white' 
                  : step > i 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {step > i ? <CheckCircle2 size={16} className="stroke-[2.5]" /> : i}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                step >= i ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {i === 1 ? (language === 'uz' ? 'Asosiy' : language === 'ru' ? 'Основное' : "Basic") : 
                 i === 2 ? (language === 'uz' ? 'Shartlar' : language === 'ru' ? 'Условия' : "Terms") : 
                 (language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : "Address")}
              </span>
            </div>
          ))}
          <div className="absolute top-[100px] md:top-[112px] left-[50%] -translate-x-[50%] w-[60%] h-[2px] bg-slate-200 -z-10">
            <div 
              className="h-full bg-brand-primary transition-all duration-300"
              style={{ width: `${(step - 1) * 50}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5 bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Vazifa nomi *" : language === 'ru' ? "Название задачи *" : "Task Name *"}
                </label>
                <input
                  type="text"
                  placeholder={language === 'uz' ? "Masalan: Omborda yuk tashuvchi" : language === 'ru' ? "Например: Грузчик на складе" : "e.g. Warehouse Loader"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Building size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Kategoriya *" : language === 'ru' ? "Категория *" : "Category *"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer outline-none ${
                        category === c.id 
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Vazifa haqida batafsil *" : language === 'ru' ? "Подробно о задаче *" : "Task Details *"}
                </label>
                <textarea
                  rows={4}
                  placeholder={language === 'uz' ? "Vazifani aniq tushuntiring..." : language === 'ru' ? "Опишите задачу ясно..." : "Describe the task clearly..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5 bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Kerakli ishchilar soni *" : language === 'ru' ? "Количество работников *" : "Number of workers *"}
                </label>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-2 w-max">
                  <button 
                    onClick={() => setNeededWorkers(String(Math.max(1, parseInt(neededWorkers) - 1)))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer outline-none active:scale-95"
                  >
                    -
                  </button>
                  <span className="font-display font-black text-base w-8 text-center">{neededWorkers}</span>
                  <button 
                    onClick={() => setNeededWorkers(String(parseInt(neededWorkers) + 1))}
                    className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold cursor-pointer outline-none active:scale-95 border-none"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Ish muddati *" : language === 'ru' ? "Срок работы *" : "Job duration *"}
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none"
                  value={date} // Hijacking 'date' state for duration
                  onChange={(e) => setDate(e.target.value)}
                >
                  <option value="1 kunlik">{language === 'uz' ? "1 kunlik" : language === 'ru' ? "1 день" : "1 day"}</option>
                  <option value="1 haftalik">{language === 'uz' ? "1 haftalik" : language === 'ru' ? "1 неделя" : "1 week"}</option>
                  <option value="1 oylik">{language === 'uz' ? "1 oylik" : language === 'ru' ? "1 месяц" : "1 month"}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Umumiy to'lov (so'm) *" : language === 'ru' ? "Общая оплата (сум) *" : "Total salary (sum) *"}
                </label>
                <input
                  type="number"
                  placeholder="Masalan: 150000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={hourlyRate} // Hijacking 'hourlyRate' state for total salary
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Transport xarajati (ixtiyoriy)" : language === 'ru' ? "Транспортные расходы (необяз.)" : "Transport expenses (optional)"}
                </label>
                <input
                  type="number"
                  placeholder="Masalan: 15000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={transportRate}
                  onChange={(e) => setTransportRate(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-5 bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Shahar / Viloyat *" : language === 'ru' ? "Город / Область *" : "City / Region *"}
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="Toshkent">Toshkent</option>
                  <option value="Samarqand">Samarqand</option>
                  <option value="Buxoro">Buxoro</option>
                  <option value="Andijon">Andijon</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} className="stroke-[2.5]" />
                  {language === 'uz' ? "Aniq manzil *" : language === 'ru' ? "Точный адрес *" : "Exact address *"}
                </label>
                <input
                  type="text"
                  placeholder={language === 'uz' ? "Masalan: Yunusobod, 14-kvartal, 20-uy" : language === 'ru' ? "Например: Юнусабад, 14-квартал, дом 20" : "e.g. Yunusabad, Quarter 14, block 20"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                />
              </div>

              <div className="mt-4 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-start gap-3">
                <div className="mt-0.5 text-brand-primary shrink-0">
                  <MapPin size={16} className="stroke-[2.5]" />
                </div>
                <p className="text-xs font-medium text-brand-primary/80 leading-relaxed">
                  {language === 'uz' ? "Ishchilar uchun manzilni aniq ko'rsatish ularning o'z vaqtida yetib kelishiga yordam beradi. Xarita funksiyasi keyingi versiyada qo'shiladi." : language === 'ru' ? "Указание точного адреса помогает работникам прибыть вовремя. Функция карты будет добавлена в следующей версии." : "Providing the exact address helps workers arrive on time."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex gap-4">
          <button
            onClick={step < 3 ? handleNext : handleSubmit}
            className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/95 text-white font-display font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer outline-none border-none"
          >
            {step < 3 ? (
              <>
                <span>{language === 'uz' ? 'Davom etish' : language === 'ru' ? 'Продолжить' : "Continue"}</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            ) : (
              <>
                <CheckCircle2 size={18} className="stroke-[2.5]" />
                <span>{language === 'uz' ? 'E\'lon qilish' : language === 'ru' ? 'Опубликовать' : "Publish"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
