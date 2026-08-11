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
    { key: 'email', name: language === 'uz' ? 'Email' : language === 'ru' ? 'Email' : 'Email' },
    { key: 'region', name: language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Region' },
    { key: 'profession', name: language === 'uz' ? 'Kasb' : language === 'ru' ? 'Профессия' : 'Profession' },
    { key: 'aboutMe', name: language === 'uz' ? "O'zim haqimda" : language === 'ru' ? 'О себе' : 'About Me' },
    { key: 'skills', name: language === 'uz' ? "Ko'nikmalar" : language === 'ru' ? 'Навыки' : 'Skills' },

    { key: 'profileImage', name: language === 'uz' ? 'Rasm' : language === 'ru' ? 'Фото' : 'Photo' }
  ];

  let completedFields = 0;
  const missingSections: { key: string, name: string }[] = [];
  
  if (userProfile) {
    fieldsToCheck.forEach(field => {
      const val = userProfile[field.key as keyof typeof userProfile];
      let isFilled = false;
      if (Array.isArray(val)) {
        isFilled = val.length > 0 && val[0].trim() !== '';
      } else {
        isFilled = val !== undefined && val !== null && String(val).trim() !== '';
      }

      if (isFilled) {
        completedFields++;
      } else {
        missingSections.push({ key: field.key, name: field.name });
      }
    });
  } else {
    // If not loaded, default to show all missing
    fieldsToCheck.forEach(field => missingSections.push({ key: field.key, name: field.name }));
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

      {progress < 100 && missingSections.length > 0 && (
        <div className="mt-1 flex items-start gap-2 bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-100/50">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold leading-tight">
              {language === 'uz' ? 'Profilni 100% qilish uchun quyidagilarni to\'ldiring:' : language === 'ru' ? 'Для 100% профиля заполните:' : 'To complete your profile, add:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingSections.slice(0, 3).map((field, idx) => (
                <span key={idx} className="text-[9px] font-black uppercase tracking-wider bg-white/60 px-1.5 py-0.5 rounded-md border border-amber-200/50">
                  {field.name}
                </span>
              ))}
              {missingSections.length > 3 && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/60 px-1.5 py-0.5 rounded-md border border-amber-200/50">
                  +{missingSections.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
