import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
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

  const categories = CATEGORIES_LIST.map(c => ({
    id: c.id,
    label: language === 'uz' ? c.labelUz : language === 'ru' ? c.labelRu : c.labelEn
  }));

  const handleNext = () => {
    if (step === 1 && (!title || !category || !responsibilities)) {
      showToast(language === 'uz' ? "Ish nomi, kategoriya va vazifalarni to'ldiring!" : "Fill title, category and responsibilities!");
      return;
    }
    if (step === 2 && (!workDate || !startTime || !endTime || !hourlyRate)) {
      showToast(language === 'uz' ? "Ish sanasi, vaqti va to'lov summasini kiriting!" : "Enter date, time and salary!");
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!addressLine || !city) {
      showToast(language === 'uz' ? "Manzilni kiriting!" : "Enter address!");
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedSalary = hourlyRate.includes("so'm") || hourlyRate.includes("UZS") ? hourlyRate : `${hourlyRate} UZS`;
      const formattedTransport = transportRate ? (transportRate.includes("so'm") || transportRate.includes("UZS") ? transportRate : `${transportRate} UZS`) : "Yo'q";

      await postNewJob({
        title, company: company || companyName, imageUrl, category, salary: formattedSalary,
        hourlyRate: formattedSalary, transportRate: formattedTransport,
        location: `${city}, ${addressLine}`, rawLocation: `${city}, ${addressLine}`,
        durationLabel, workDate, workTime: `${startTime} - ${endTime}`,
        neededWorkers, responsibilities, description: description || responsibilities,
        requirements, importantNote, tags, coordinates: { x: coordinateX, y: coordinateY }
      });
      onSubmitSuccess();
    } catch (err) {
      showToast(language === 'uz' ? "Serverda xatolik yuz berdi. Qaytadan urinib ko'ring." : "An error occurred. Please try again.");
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
            className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-brand-primary/60 disabled:cursor-not-allowed text-white font-display font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer outline-none border-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin stroke-[2.5]" />
                <span>{language === 'uz' ? "Yuborilmoqda..." : "Publishing..."}</span>
              </>
            ) : step < 3 ? (
              <>
                <span>{language === 'uz' ? 'Davom etish' : 'Continue'}</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            ) : (
              <>
                <CheckCircle2 size={18} className="stroke-[2.5]" />
                <span>{language === 'uz' ? 'E\'lon qilish' : 'Publish'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
