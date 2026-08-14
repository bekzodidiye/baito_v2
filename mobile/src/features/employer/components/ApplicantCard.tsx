import React from 'react';
import { Check, X, Star, Briefcase, MapPin, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { confirmStartJobApi } from '../../../api/queries';

interface ApplicantCardProps {
  app: any;
  language: string;
  updateApplicationStatus: (id: string, status: 'hired' | 'rejected') => void;
  onChatClick: (candidateName: string) => void;
}

export const ApplicantCard: React.FC<ApplicantCardProps> = ({
  app,
  language,
  updateApplicationStatus,
  onChatClick
}) => {
  const isHired = app.status === 'hired';
  const isRejected = app.status === 'rejected';
  
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
      <div className={`flex items-start gap-4 ${isHired || isRejected ? 'mt-2' : ''}`}>
        <div className="relative">
          <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-brand-primary to-blue-300">
            <img
              src={app.workerAvatar || app.candidateAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"}
              alt={app.workerName || app.candidateName}
              className="w-full h-full rounded-full object-cover border-2 border-white bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border-2 border-white shadow-sm">
            <Star size={10} className="fill-white" />
            {app.workerRating ? app.workerRating.toFixed(1) : (app.rating || '0.0')}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex justify-between items-start">
            <h3 className="font-display font-black text-base text-slate-800 truncate">
              {app.workerName || app.candidateName}
            </h3>
            {/* Status Badges */}
            {isHired && (
              <span className="shrink-0 bg-emerald-50 text-emerald-600 text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-md ml-2 border border-emerald-100/50">
                {language === 'uz' ? "Qabul qilindi" : language === 'ru' ? "Принят" : "Approved"}
              </span>
            )}
            {isRejected && (
              <span className="shrink-0 bg-rose-50 text-rose-600 text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-md ml-2 border border-rose-100/50">
                {language === 'uz' ? "Rad etildi" : language === 'ru' ? "Отклонен" : "Rejected"}
              </span>
            )}
            {app.status === 'completed' && (
              <span className="shrink-0 bg-blue-50 text-blue-600 text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-md ml-2 border border-blue-100/50">
                {language === 'uz' ? "Tugallangan" : language === 'ru' ? "Завершено" : "Completed"}
              </span>
            )}
            {app.status === 'in_progress' && (
              <span className="shrink-0 bg-amber-50 text-amber-600 text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-md ml-2 border border-amber-100/50">
                {language === 'uz' ? "Jarayonda" : language === 'ru' ? "В процессе" : "In Progress"}
              </span>
            )}
            {app.status === 'cancelled' && (
              <span className="shrink-0 bg-slate-100 text-slate-500 text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-md ml-2 border border-slate-200">
                {language === 'uz' ? "Bekor qilingan" : language === 'ru' ? "Отменено" : "Cancelled"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500 font-medium">
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
                return parts.length > 0 ? parts.join(', ') : '-';
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Skills */}
      {app.workerSkills && app.workerSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {app.workerSkills.map((skill: string, idx: number) => (
            <span key={idx} className="px-2.5 py-1 bg-brand-primary/5 text-brand-primary text-[10px] font-bold rounded-lg border border-brand-primary/10">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 bg-gradient-to-br from-slate-50 to-white p-3.5 rounded-2xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Briefcase size={14} className="text-blue-500 stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Ishlar" : language === 'ru' ? "Работы" : "Jobs"}</span>
            <span className="text-xs font-black text-slate-700">{app.workerCompletedJobs || 0} ta</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            <MapPin size={14} className="text-indigo-500 stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Masofa" : language === 'ru' ? "Расст." : "Distance"}</span>
            <span className="text-xs font-black text-slate-700">{app.distance || '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <Clock size={14} className="text-orange-500 stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Vaqti" : language === 'ru' ? "Время" : "Time"}</span>
            <span className="text-xs font-black text-slate-700">{app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle size={14} className="text-emerald-500 stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Holat" : language === 'ru' ? "Статус" : "Status"}</span>
            <span className="text-xs font-black text-emerald-600">{app.workerStatus || '-'}</span>
          </div>
        </div>
      </div>

      {/* Applied Job Info */}
      <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/60">
        <div className="w-1 self-stretch bg-brand-primary rounded-full shrink-0"></div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{language === 'uz' ? "Ariza topshirilgan ish:" : language === 'ru' ? "Заявка на работу:" : "Applied for:"}</span>
          <p className="text-xs font-bold text-slate-800 line-clamp-1">{app.jobTitle}</p>
          {(app.workerBio || app.candidateExperience) && (
            <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
              {app.workerBio || app.candidateExperience}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {(app.status === 'start_requested' || app.status === 'applied') && (
        <div className="mt-1 flex gap-2">
          {app.status === 'start_requested' ? (
            <button
              onClick={async () => {
                await confirmStartJobApi(app.jobId);
                window.location.reload();
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-[0_4px_12px_rgba(245,158,11,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <Check size={16} className="stroke-[3]" />
              <span>{language === 'uz' ? "Ishni boshlashni tasdiqlash" : language === 'ru' ? "Подтвердить начало работы" : "Confirm Start Job"}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => updateApplicationStatus(app.id, 'hired')}
                className="flex-1 py-3 bg-gradient-to-r from-brand-primary to-blue-600 hover:from-brand-primary/90 hover:to-blue-600/90 text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,6,102,0.15)] hover:shadow-[0_6px_16px_rgba(0,6,102,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} className="stroke-[2.5]" />
                <span>{language === 'uz' ? "Qabul qilish" : language === 'ru' ? "Одобрить" : "Approve"}</span>
              </button>
              <button
                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                className="w-12 h-11 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};
