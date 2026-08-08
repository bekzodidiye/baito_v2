import React from 'react';
import { Target, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';

interface ProfileCompletionWidgetProps {
  language: 'uz' | 'ru' | 'en';
}

export const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({ language }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  
  
  const { userProfile } = useApp();
  
  // Calculate completion based on actual user profile data
  const fieldsToCheck = [
    { key: 'firstName', name: language === 'uz' ? 'Ism' : language === 'ru' ? 'Имя' : 'First Name' },
    { key: 'lastName', name: language === 'uz' ? 'Familiya' : language === 'ru' ? 'Фамилия' : 'Last Name' },
    { key: 'phone', name: language === 'uz' ? 'Telefon' : language === 'ru' ? 'Телефон' : 'Phone' },
    { key: 'profileImage', name: language === 'uz' ? 'Rasm' : language === 'ru' ? 'Фото' : 'Photo' },
    { key: 'bio', name: language === 'uz' ? 'Bio' : language === 'ru' ? 'О себе' : 'Bio' },
    { key: 'jobTitle', name: language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Job Title' },
    { key: 'docFileName1', name: language === 'uz' ? 'Hujjat' : language === 'ru' ? 'Документ' : 'Document' }
  ];

  let completedFields = 0;
  const missingSections: string[] = [];
  
  if (userProfile) {
    fieldsToCheck.forEach(field => {
      const val = userProfile[field.key as keyof typeof userProfile];
      if (val && String(val).trim() !== '') {
        completedFields++;
      } else {
        missingSections.push(field.name);
      }
    });
  } else {
    // If not loaded, default to show all missing
    fieldsToCheck.forEach(field => missingSections.push(field.name));
  }

  const progress = Math.round((completedFields / fieldsToCheck.length) * 100) || 0;


  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col gap-3.5 shrink-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-brand-primary" />
          <h3 className="text-xs font-black text-slate-800">
            {language === 'uz' ? 'Profil to\'ldirilishi' : language === 'ru' ? 'Заполнение профиля' : "Profile Completion"}
          </h3>
        </div>
        <span className="text-[11px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">{progress}%</span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="h-full bg-brand-primary rounded-full relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }} />
        </motion.div>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-100/50">
        <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
          {language === 'uz' ? 'Qidiruvlarda ko\'proq ko\'rinish uchun quyidagi bo\'limlarni to\'ldiring:' : language === 'ru' ? 'Заполните следующие разделы, чтобы быть заметнее в поиске:' : "Complete the following sections to improve search visibility:"}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {missingSections.map((section, idx) => (
          <button onClick={() => { setCurrentScreen('profile'); setTimeout(() => window.dispatchEvent(new CustomEvent('scroll-to-profile-section', { detail: section })), 300); }} key={idx} className="flex items-center justify-between py-2.5 px-3.5 bg-slate-50 hover:bg-brand-primary/5 rounded-xl transition-all duration-200 group border border-slate-100 hover:border-brand-primary/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.98]">
            <span className="text-[11px] font-bold text-slate-700 group-hover:text-brand-primary transition-colors">{section}</span>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};
