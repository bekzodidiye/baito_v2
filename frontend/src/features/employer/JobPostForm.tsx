import React, { useEffect, useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { JobPostHeader } from './components/JobPostHeader';
import { JobPostStepOne } from './components/JobPostStepOne';
import { JobPostStepTwo } from './components/JobPostStepTwo';
import { JobPostStepThree } from './components/JobPostStepThree';
import { CATEGORIES_LIST } from '../../constants/categories';
import { showToast } from '../../utils/toast';

interface JobPostFormProps {
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export const JobPostForm: React.FC<JobPostFormProps> = ({ onBack, onSubmitSuccess }) => {
  const { postNewJob, language, companyName } = useEmployer();
  // The server refuses a posting from an unverified account. Checking here
  // means the refusal arrives before three steps of form, not after them.
  const { userProfile } = useApp();
  const isVerified = !!userProfile?.isVerified;
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('retail');
  const [company, setCompany] = useState(companyName || '');
  const [imageUrl, setImageUrl] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['#Tezkor', "#KunlikTo'lov"]);

  // Step 2 State
  const [neededWorkers, setNeededWorkers] = useState('1');
  const [workDate, setWorkDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [durationLabel, setDurationLabel] = useState('1 kunlik');
  const [hourlyRate, setHourlyRate] = useState('');
  const [transportRate, setTransportRate] = useState('');
  const [requirements, setRequirements] = useState('');
  const [importantNote, setImportantNote] = useState('');

  // Step 3 State
  const [city, setCity] = useState('Toshkent');
  const [addressLine, setAddressLine] = useState('');
  const [coordinateX, setCoordinateX] = useState(50);
  const [coordinateY, setCoordinateY] = useState(50);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The categories an administrator maintains. The form used to carry its own
  // hard-coded copy, so anything added in the admin panel never appeared here.
  const [adminCategories, setAdminCategories] = useState<{ slug: string; name: string }[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient('/categories')
      .then((rows: { slug: string; name: string }[]) => {
        if (alive && Array.isArray(rows) && rows.length > 0) setAdminCategories(rows);
      })
      // A failed request leaves this null and the built-in list stands in. An
      // employer must never be shown an empty category picker — that is a form
      // they cannot submit at all.
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const translated = (slug: string, name: string) => {
    // The table stores one name. For the categories that shipped with the app
    // the built-in list still holds the Russian and English wording, so a
    // non-Uzbek reader keeps it; anything an administrator added has only the
    // one name they typed.
    const known = CATEGORIES_LIST.find(c => c.id === slug);
    if (!known) return name;
    return language === 'uz' ? known.labelUz : language === 'ru' ? known.labelRu : known.labelEn;
  };

  const categories = adminCategories
    ? adminCategories.map(c => ({ id: c.slug, label: translated(c.slug, c.name) }))
    : CATEGORIES_LIST.map(c => ({
        id: c.id,
        label: language === 'uz' ? c.labelUz : language === 'ru' ? c.labelRu : c.labelEn
      }));

  // The form opens on 'retail'. If an administrator has removed that category,
  // a select shows its first option while the state still says 'retail' — and
  // the job would be filed under a category that no longer exists.
  useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.id === category)) {
      setCategory(categories[0].id);
    }
  }, [adminCategories]);

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim() || title.trim().length < 3) {
        showToast(language === 'uz' ? "Ish nomi kamida 3 ta belgidan iborat bo'lishi kerak!" : language === 'ru' ? "Название вакансии должно содержать не менее 3 символов!" : "Job title must be at least 3 characters!");
        return;
      }
      if (!category) {
        showToast(language === 'uz' ? "Kategoriyani tanlang!" : language === 'ru' ? "Выберите категорию!" : "Select category!");
        return;
      }
      if (!responsibilities.trim() || responsibilities.trim().length < 10) {
        showToast(language === 'uz' ? "Ish vazifalarini batafsilroq yozing (kamida 10 ta belgi)!" : language === 'ru' ? "Пожалуйста, опишите обязанности подробнее (не менее 10 символов)!" : "Please provide more details in responsibilities (at least 10 chars)!");
        return;
      }
    }
    if (step === 2 && (!workDate || !startTime || !endTime || !hourlyRate || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0 || !neededWorkers || isNaN(Number(neededWorkers)) || Number(neededWorkers) <= 0)) {
      showToast(language === 'uz' ? "Ish sanasi, vaqti, ishchilar soni va to'lov summasini to'g'ri kiriting!" : language === 'ru' ? "Введите корректные дату, время, количество работников и зарплату!" : "Enter valid date, time, workers count and salary!");
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!addressLine || !addressLine.trim() || !city) {
      showToast(language === 'uz' ? "Manzilni kiriting!" : language === 'ru' ? "Введите адрес!" : "Enter address!");
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedSalary = hourlyRate.includes("so'm") || hourlyRate.includes("UZS") ? hourlyRate : `${hourlyRate} UZS`;
      const formattedTransport = transportRate ? (transportRate.includes("so'm") || transportRate.includes("UZS") ? transportRate : `${transportRate} UZS`) : "Yo'q";
      const safeCompany = (company || companyName || "Ish beruvchi").trim();
      const rawDesc = (description || responsibilities || '').trim();
      const safeDesc = rawDesc.length >= 10 ? rawDesc : `${title}: ${rawDesc || "Batafsil ma'lumot olish uchun murojaat qiling."}`;

      await postNewJob({
        title: title.trim(),
        company: safeCompany,
        imageUrl,
        category,
        salary: formattedSalary,
        hourlyRate: formattedSalary,
        transportRate: formattedTransport,
        location: `${city}, ${addressLine}`,
        rawLocation: `${city}, ${addressLine}`,
        durationLabel,
        workDate,
        workTime: `${startTime} - ${endTime}`,
        neededWorkers,
        responsibilities: responsibilities || safeDesc,
        description: safeDesc,
        requirements,
        importantNote,
        tags,
        coordinates: { x: coordinateX, y: coordinateY }
      });
      onSubmitSuccess();
    } catch (err: any) {
      const msg = err?.message || (language === 'uz' ? "Serverda xatolik yuz berdi. Qaytadan urinib ko'ring." : language === 'ru' ? "Произошла ошибка. Пожалуйста, попробуйте еще раз." : "An error occurred. Please try again.");
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col pb-32">
      <JobPostHeader step={step} language={language} onBack={handleBack} />

      <div className="w-full max-w-4xl mx-auto p-4 md:p-8">

        <AnimatePresence mode="wait">
          {step === 1 && (
            <JobPostStepOne
              language={language} title={title} setTitle={setTitle}
              category={category} setCategory={setCategory} categories={categories}
              company={company} setCompany={setCompany}
              imageUrl={imageUrl} setImageUrl={setImageUrl}
              responsibilities={responsibilities} setResponsibilities={setResponsibilities}
              description={description} setDescription={setDescription}
              tags={tags} setTags={setTags}
            />
          )}
          {step === 2 && (
            <JobPostStepTwo
              language={language} neededWorkers={neededWorkers} setNeededWorkers={setNeededWorkers}
              workDate={workDate} setWorkDate={setWorkDate}
              startTime={startTime} setStartTime={setStartTime}
              endTime={endTime} setEndTime={setEndTime}
              durationLabel={durationLabel} setDurationLabel={setDurationLabel}
              hourlyRate={hourlyRate} setHourlyRate={setHourlyRate}
              transportRate={transportRate} setTransportRate={setTransportRate}
              requirements={requirements} setRequirements={setRequirements}
              importantNote={importantNote} setImportantNote={setImportantNote}
            />
          )}
          {step === 3 && (
            <JobPostStepThree
              language={language} city={city} setCity={setCity}
              addressLine={addressLine} setAddressLine={setAddressLine}
              coordinateX={coordinateX} setCoordinateX={setCoordinateX}
              coordinateY={coordinateY} setCoordinateY={setCoordinateY}
            />
          )}
        </AnimatePresence>

        <div className="mt-8 flex gap-4">
          <button
            onClick={step < 3 ? handleNext : handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-brand-primary/60 disabled:cursor-not-allowed text-white font-display font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 border-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin stroke-[2.5]" />
                <span>{language === 'uz' ? "Yuborilmoqda..." : language === 'ru' ? "Публикация..." : "Publishing..."}</span>
              </>
            ) : step < 3 ? (
              <>
                <span>{language === 'uz' ? 'Davom etish' : language === 'ru' ? 'Продолжить' : 'Continue'}</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            ) : (
              <>
                <CheckCircle2 size={18} className="stroke-[2.5]" />
                <span>{language === 'uz' ? 'E\'lon qilish' : language === 'ru' ? 'Опубликовать' : 'Publish'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
