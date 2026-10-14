import React from 'react';
import { Briefcase, Users, UserCheck, Star, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface EmployerProfileStatsProps {
  onPaymentsClick?: () => void;
  postedJobsCount: number;
  activeJobsCount: number;
  applicantsCount: number;
  hiredCount: number;
  rating?: number;
  balance?: string | number;
  language: 'uz' | 'ru' | 'en';
}

/* The worker profile puts jobs and rating next to the name, so the page says
   something about the account rather than only listing its fields. This is the
   employer's half of that, and every number comes from data the panel already
   loads - postedJobs and applications from useEmployer - rather than from a
   new endpoint. Rating is hidden when unset: an employer with no reviews yet
   should not read as nought out of five. */
export const EmployerProfileStats: React.FC<EmployerProfileStatsProps> = ({
  postedJobsCount,
  activeJobsCount,
  applicantsCount,
  hiredCount,
  rating,
  balance,
  language,
  onPaymentsClick,
}) => {
  const t = (uz: string, ru: string, en: string) =>
    language === 'uz' ? uz : language === 'ru' ? ru : en;

  const tiles = [
    {
      icon: Briefcase,
      value: String(postedJobsCount),
      label: t("E'lonlar", 'Объявления', 'Jobs posted'),
      hint: t(`${activeJobsCount} faol`, `${activeJobsCount} активных`, `${activeJobsCount} active`),
      tone: 'text-brand-primary bg-brand-primary/10',
    },
    {
      icon: Users,
      value: String(applicantsCount),
      label: t('Arizalar', 'Заявки', 'Applicants'),
      tone: 'text-blue-600 bg-blue-50',
    },
    {
      icon: UserCheck,
      value: String(hiredCount),
      label: t('Ishga olindi', 'Наняты', 'Hired'),
      tone: 'text-emerald-600 bg-emerald-50',
    },
  ];

  
  // We add Balance as the 4th tile to fill the empty space
  tiles.push({
    icon: DollarSign,
    value: balance ? Number(balance).toLocaleString() : '0',
    label: t('Jami xarajatlar', 'Общие расходы', 'Total expenses'),
    hint: 'UZS',
    tone: 'text-purple-600 bg-purple-50',
  });

  if (typeof rating === 'number' && rating > 0) {
    tiles.push({
      icon: Star,
      value: rating.toFixed(1),
      label: t('Reyting', 'Рейтинг', 'Rating'),
      tone: 'text-amber-500 bg-amber-50',
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="grid grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isBalance = tile.label === t('Jami xarajatlar', 'Общие расходы', 'Total expenses');
        return (
          <div
            key={tile.label}
            onClick={isBalance ? onPaymentsClick : undefined}
            className={`bg-white rounded-2xl border border-slate-100 shadow-xs p-4 flex flex-col gap-2 ${isBalance ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tile.tone}`}>
              <Icon size={17} className="stroke-[2.3]" />
            </div>
            <div>
              <p className="font-display font-black text-lg text-slate-800 leading-none">{tile.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                {tile.label}
              </p>
              {tile.hint && (
                <p className="text-[10px] font-bold text-slate-500 mt-1">{tile.hint}</p>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
