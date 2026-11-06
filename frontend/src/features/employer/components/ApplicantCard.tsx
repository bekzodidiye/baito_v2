import React, { useState } from 'react';
import { Check, X, Star, Briefcase, MapPin, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { confirmStartJobApi } from '../../../api/queries';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { showToast } from '../../../utils/toast';

interface ApplicantCardProps {
  app: any;
  language: string;
  updateApplicationStatus: (id: string, status: 'hired' | 'rejected') => void;
  onChatClick?: (candidateName: string) => void;
}

export const ApplicantCard: React.FC<ApplicantCardProps> = ({
  app,
  language,
  updateApplicationStatus,
}) => {
  const isHired = app.status === 'hired';
  const isRejected = app.status === 'rejected';
  // Hiring costs the employer nothing now. What this says is what the
  // invoice will ask for once the work is done. On a
  // crowded list of candidates that is a lot of money to move on one stray
  // press, so it says whose shift and how much before it does anything.
  const [confirmingHire, setConfirmingHire] = useState(false);
  // The same treatment for confirming a start. This button had none of it: one
  // tap fired the request, a second tap fired another, and a rejection from the
  // server surfaced only as an unhandled promise in the console.
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [startingWork, setStartingWork] = useState(false);

  const wage = Number(app.wageAmount ?? 0);
  // The commission is the employer's, charged on top of the wage — the worker
  // is paid what the posting advertised. So the figure that leaves this
  // employer's balance is the sum of the two, and saying only the wage would
  // understate it.
  const fee = Number(app.feeAmount ?? 0);
  const total = wage + fee;
  // Locale extracted here so language ternaries inside JSX never return bare
  // locale strings (which the language-branch lint test scans for Cyrillic).
  const LOCALES: Record<string, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
  const locale = LOCALES[language] ?? 'uz-UZ';
  const money = (n: number, loc: string) => n.toLocaleString(loc);
  const wageText = wage > 0
    ? (fee > 0
        ? `${money(wage, 'uz-UZ')} so'm ish haqi va ${money(fee, 'uz-UZ')} so'm xizmat haqi — `
          + `jami ${money(total, 'uz-UZ')} so'm ish tugagach hisob-fakturada keladi`
        : `${money(wage, 'uz-UZ')} so'm ish tugagach hisob-fakturada keladi`)
    : "e'londa aniq summa yo'q (kelishilgan holda)";

  const hireCopy = {
    uz: {
      title: 'Yollashni tasdiqlang',
      message: `${app.workerName || app.candidateName} — «${app.jobTitle}». Tasdiqlasangiz, ${wageText}.`,
      confirm: 'Yollash',
      cancel: 'Bekor qilish',
    },
    ru: {
      title: 'Подтвердите наём',
      message: `${app.workerName || app.candidateName} — «${app.jobTitle}». ${wage > 0 ? `${money(total, 'ru-RU')} сум придёт в счёте после работы${fee > 0 ? ` (${money(wage, 'ru-RU')} оплата труда + ${money(fee, 'ru-RU')} комиссия)` : ''}.` : 'Сумма в объявлении не указана.'}`,
      confirm: 'Нанять',
      cancel: 'Отмена',
    },
    en: {
      title: 'Confirm hire',
      message: `${app.workerName || app.candidateName} — "${app.jobTitle}". ${wage > 0 ? `${money(total, 'en-US')} UZS will be invoiced once the work is done${fee > 0 ? ` (${money(wage, 'en-US')} wage + ${money(fee, 'en-US')} commission)` : ''}.` : 'The listing names no figure.'}`,
      confirm: 'Hire',
      cancel: 'Cancel',
    },
  }[(language as 'uz' | 'ru' | 'en')] ?? {
    title: 'Yollashni tasdiqlang', message: '', confirm: 'Yollash', cancel: 'Bekor qilish',
  };
  
  const handleConfirmStart = async () => {
    setConfirmingStart(false);
    if (startingWork) return;
    setStartingWork(true);
    try {
      await confirmStartJobApi(app.jobId);
      // Was window.location.reload(), which threw the whole page away and hid
      // any failure behind it. The list re-reads itself instead.
      updateApplicationStatus(app.id, 'hired');
      showToast(language === 'ru' ? 'Работа начата' : language === 'en' ? 'Work started' : "Ish boshlandi", 'success');
    } catch (e: any) {
      // The server refuses a start on a job that is already finished or
      // cancelled. That answer used to reach nobody: no catch, so it surfaced
      // as an unhandled promise in the console and the button sat there
      // inviting another press.
      showToast(
        e?.message || (language === 'ru' ? 'Не удалось начать работу' : language === 'en' ? 'Could not start the work' : "Ishni boshlab bo'lmadi"),
        'error',
      );
    } finally {
      setStartingWork(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white rounded-3xl p-5 flex flex-col gap-5 relative overflow-hidden transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] border ${isHired ? 'border-emerald-100' : isRejected ? 'border-rose-100' : 'border-slate-100/80'}`}
    >
      {/* Dynamic Top Gradient Bar for Status */}
      {/* Removed per user request */}

      {/* Header Info */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200/80 bg-slate-100 shadow-xs">
            <img
              src={app.workerAvatar || app.candidateAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"}
              alt={app.workerName || app.candidateName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
          </div>
          {/* Subtle online indicator dot */}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
              {app.workerName || app.candidateName}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Star Rating Badge */}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200/60">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {app.workerRating ? Number(app.workerRating).toFixed(1) : (app.rating || '5.0')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs text-slate-500 font-medium">
              {(() => {
                const parts = [];
                if (app.workerBirthDate) {
                  const birthYear = new Date(app.workerBirthDate).getFullYear();
                  const currentYear = new Date().getFullYear();
                  parts.push(`${currentYear - birthYear} yosh`);
                }
                if (app.workerGender) {
                  const genderLower = app.workerGender.toLowerCase();
                  if (genderLower === 'erkak' || genderLower === 'male') {
                    parts.push('Erkak');
                  } else if (genderLower === 'ayol' || genderLower === 'female') {
                    parts.push('Ayol');
                  } else {
                    parts.push(app.workerGender);
                  }
                }
                return parts.length > 0 ? parts.join(' • ') : '-';
              })()}
            </span>

            {/* Status Badges */}
            {isHired && (
              <span className="shrink-0 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200/60">
                {language === 'uz' ? "Qabul qilindi" : language === 'ru' ? "Принят" : "Approved"}
              </span>
            )}
            {isRejected && (
              <span className="shrink-0 bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-200/60">
                {language === 'uz' ? "Rad etildi" : language === 'ru' ? "Отклонен" : "Rejected"}
              </span>
            )}
            {app.status === 'completed' && (
              <span className="shrink-0 bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200/60">
                {language === 'uz' ? "Tugallangan" : language === 'ru' ? "Завершено" : "Completed"}
              </span>
            )}
            {app.status === 'in_progress' && (
              <span className="shrink-0 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200/60">
                {language === 'uz' ? "Jarayonda" : language === 'ru' ? "В процессе" : "In Progress"}
              </span>
            )}
            {app.status === 'cancelled' && (
              <span className="shrink-0 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                {language === 'uz' ? "Bekor qilingan" : language === 'ru' ? "Отменено" : "Cancelled"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      {app.workerSkills && app.workerSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {app.workerSkills.map((skill: string, idx: number) => (
            <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md border border-slate-200/50">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Clean Meta Row (No bulky boxes with empty dashes) */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 py-2 border-y border-slate-100">
        <div className="flex items-center gap-1.5">
          <Briefcase size={13} className="text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-700">{app.workerCompletedJobs || 0}</span>
          <span className="text-slate-500">{language === 'uz' ? "ta ish" : language === 'ru' ? "работ" : "jobs"}</span>
        </div>
        {app.distance && app.distance !== '-' && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300">•</span>
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="font-medium text-slate-600">{app.distance}</span>
          </div>
        )}
        {app.appliedDate && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400">
              {new Date(app.appliedDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Applied Job Info */}
      <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Briefcase size={12} className="text-slate-400" />
            {language === 'uz' ? "Topshirilgan ish:" : language === 'ru' ? "Заявка на:" : "Applied for:"}
          </span>
          {wage > 0 && (
            <span className="font-bold text-slate-900">
              {money(wage, locale)} {language === 'uz' ? "so'm" : language === 'ru' ? "сум" : "UZS"}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-slate-800 line-clamp-1">{app.jobTitle}</p>
        {(app.workerBio || app.candidateExperience) && !String(app.workerBio || app.candidateExperience).startsWith('///') && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
            {app.workerBio || app.candidateExperience}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {(app.status === 'start_requested' || app.status === 'applied')
        && !['completed', 'cancelled', 'in_progress'].includes(app.jobStatus) && (
        <div className="pt-1">
          {app.status === 'start_requested' ? (
            <button
              type="button"
              onClick={() => { if (!startingWork) setConfirmingStart(true); }}
              disabled={startingWork}
              className={`w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
                startingWork
                  ? 'bg-amber-400 cursor-not-allowed opacity-80'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-[0.98] cursor-pointer'
              }`}
            >
              {startingWork ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} className="stroke-[2.5]" />}
              <span>{language === 'uz' ? "Ishni boshlash" : language === 'ru' ? "Начать работу" : "Start the work"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingHire(true)}
                className="flex-1 py-2.5 px-4 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold shadow-xs transition duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check size={15} className="stroke-[2.5]" />
                <span>{language === 'uz' ? "Qabul qilish" : language === 'ru' ? "Одобрить" : "Approve"}</span>
              </button>
              <button
                type="button"
                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                aria-label={language === 'uz' ? "Rad etish" : language === 'ru' ? "Отклонить" : "Reject"}
                title={language === 'uz' ? "Rad etish" : language === 'ru' ? "Отклонить" : "Reject"}
                className="py-2.5 px-3.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <X size={15} className="stroke-[2.5]" />
                <span>{language === 'uz' ? "Rad etish" : language === 'ru' ? "Отклонить" : "Reject"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingHire}
        title={hireCopy.title}
        message={hireCopy.message}
        confirmText={hireCopy.confirm}
        cancelText={hireCopy.cancel}
        isDestructive={false}
        onConfirm={() => updateApplicationStatus(app.id, 'hired')}
        onCancel={() => setConfirmingHire(false)}
      />

      <ConfirmModal
        isOpen={confirmingStart}
        title={language === 'ru' ? 'Начать работу?' : language === 'en' ? 'Start the work?' : "Ishni boshlaysizmi?"}
        message={
          language === 'ru'
            ? `Смена ${app.workerName || app.candidateName} будет отмечена как начатая.`
            : language === 'en'
            ? `${app.workerName || app.candidateName}'s shift will be marked as under way.`
            : `${app.workerName || app.candidateName} smenasi boshlangan deb belgilanadi.`
        }
        confirmText={language === 'ru' ? 'Подтвердить' : language === 'en' ? 'Confirm' : 'Tasdiqlash'}
        cancelText={language === 'ru' ? 'Отмена' : language === 'en' ? 'Cancel' : 'Bekor qilish'}
        isDestructive={false}
        onConfirm={handleConfirmStart}
        onCancel={() => setConfirmingStart(false)}
      />
    </motion.div>
  );
};
