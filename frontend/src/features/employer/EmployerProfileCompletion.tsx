import React from 'react';
import { Target, AlertCircle, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { UserProfile } from '../../context/types';

interface EmployerProfileCompletionProps {
  userProfile: UserProfile | null;
  language: 'uz' | 'ru' | 'en';
  onEdit: () => void;
}

/* The worker profile has a completion widget; the employer side had nothing
   telling anyone their company page was half empty. Same idea, company fields.
   The list is only what an employer can actually fill from the edit form plus
   the logo, so every missing item here has somewhere to go. */
export const EmployerProfileCompletion: React.FC<EmployerProfileCompletionProps> = ({
  userProfile,
  language,
  onEdit,
}) => {
  const t = (uz: string, ru: string, en: string) =>
    language === 'uz' ? uz : language === 'ru' ? ru : en;

  const fields = [
    { key: 'firstName', name: t('Kompaniya nomi', 'Название компании', 'Company name') },
    { key: 'phone', name: t('Telefon', 'Телефон', 'Phone') },
    { key: 'region', name: t('Manzil', 'Адрес', 'Address') },
    { key: 'aboutMe', name: t('Kompaniya haqida', 'О компании', 'About') },
    { key: 'profileImage', name: t('Logotip', 'Логотип', 'Logo') },
  ] as const;

  const missing = fields.filter((f) => {
    const val = userProfile ? userProfile[f.key as keyof UserProfile] : undefined;
    return val === undefined || val === null || String(val).trim() === '';
  });

  const done = fields.length - missing.length;
  const percent = Math.round((done / fields.length) * 100);
  const complete = missing.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            complete ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-primary/10 text-brand-primary'
          }`}>
            <Target size={17} className="stroke-[2.3]" />
          </div>
          <div>
            <p className="font-display font-black text-sm text-slate-800 leading-none">
              {t('Profil toʻldirilgani', 'Заполненность профиля', 'Profile completion')}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
              {done}/{fields.length}
            </p>
          </div>
        </div>
        <span className={`font-display font-black text-lg ${
          complete ? 'text-emerald-600' : 'text-brand-primary'
        }`}>
          {percent}%
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-brand-primary'}`}
        />
      </div>

      {complete ? (
        <p className="text-[11px] font-bold text-emerald-600">
          {t('Hammasi toʻldirilgan.', 'Всё заполнено.', 'Everything is filled in.')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500"
              >
                <AlertCircle size={11} className="text-amber-500 shrink-0" />
                {f.name}
              </span>
            ))}
          </div>
          <button
            onClick={onEdit}
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <Edit2 size={13} className="stroke-[2.5]" />
            <span>{t('Toʻldirish', 'Заполнить', 'Fill in')}</span>
          </button>
        </>
      )}
    </motion.div>
  );
};
