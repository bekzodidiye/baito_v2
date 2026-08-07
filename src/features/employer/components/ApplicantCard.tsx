import React from 'react';
import { Check, X, Star, MessageSquare, Briefcase, MapPin, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow relative overflow-hidden"
    >
      {app.status === 'hired' && (
        <div className="absolute top-0 left-0 w-full bg-emerald-500 text-white text-[10px] font-bold text-center py-1">
          {language === 'uz' ? "Qabul qilindi" : language === 'ru' ? "Принят" : "Approved"}
        </div>
      )}
      {app.status === 'rejected' && (
        <div className="absolute top-0 left-0 w-full bg-rose-500 text-white text-[10px] font-bold text-center py-1">
          {language === 'uz' ? "Rad etildi" : language === 'ru' ? "Отклонен" : "Rejected"}
        </div>
      )}

      <div className={`flex items-start gap-3 ${app.status !== 'applied' ? 'mt-4' : ''}`}>
        <div className="relative">
          <img
            src={app.candidateAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"}
            alt={app.candidateName}
            className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-100"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[9px] font-black px-1 rounded flex items-center gap-0.5 border-2 border-white shadow-xs">
            <Star size={8} className="fill-white" />
            {app.rating || '5.0'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-black text-sm text-slate-800 truncate">
            {app.candidateName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-500 font-bold">{app.candidateName.length % 2 === 0 ? "24 yosh, Erkak" : "21 yosh, Ayol"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["Tajribali", "Tezkor", "Mas'uliyatli"].map((skill, idx) => (
          <span key={idx} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md border border-slate-100">
            {skill}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-slate-400 stroke-[2]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Ishlar" : language === 'ru' ? "Работы" : "Jobs"}</span>
            <span className="text-[11px] font-black text-slate-700">12 ta</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400 stroke-[2]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Masofa" : language === 'ru' ? "Расст." : "Distance"}</span>
            <span className="text-[11px] font-black text-slate-700">2.4 km</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400 stroke-[2]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Vaqti" : language === 'ru' ? "Время" : "Time"}</span>
            <span className="text-[11px] font-black text-slate-700">{app.appliedDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-500 stroke-[2]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{language === 'uz' ? "Holat" : language === 'ru' ? "Статус" : "Status"}</span>
            <span className="text-[11px] font-black text-emerald-600">{language === 'uz' ? "Band emas" : language === 'ru' ? "Свободен" : "Available"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'uz' ? "Qaysi ishga:" : language === 'ru' ? "На какую работу:" : "Applied for:"}</span>
        <p className="text-xs font-bold text-brand-primary truncate">{app.jobTitle}</p>
        <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
          "{app.candidateExperience}"
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        {app.status === 'start_requested' ? (
          <button
            onClick={async () => {
              const { confirmStartJobApi } = await import('../../../api/queries');
              await confirmStartJobApi(app.jobId);
              window.location.reload();
            }}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer outline-none animate-pulse"
          >
            <Check size={16} className="stroke-[3]" />
            <span>{language === 'uz' ? "Ishni boshlashni tasdiqlash" : language === 'ru' ? "Подтвердить начало работы" : "Confirm Start Job"}</span>
          </button>
        ) : app.status === 'applied' ? (
          <>
            <button
              onClick={() => updateApplicationStatus(app.id, 'hired')}
              className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer outline-none shadow-sm"
            >
              <Check size={14} className="stroke-[2.5]" />
              <span>{language === 'uz' ? "Qabul qilish" : language === 'ru' ? "Одобрить" : "Approve"}</span>
            </button>
            <button
              onClick={() => updateApplicationStatus(app.id, 'rejected')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-rose-600 rounded-xl transition-all active:scale-98 flex items-center justify-center cursor-pointer outline-none"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>
          </>
        ) : app.status === 'hired' ? (
          <button
            onClick={() => onChatClick(app.candidateName)}
            className="w-full py-2.5 bg-blue-50 hover:bg-blue-100/70 text-brand-primary rounded-xl text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer outline-none"
          >
            <MessageSquare size={14} className="stroke-[2.5]" />
            <span>{language === 'uz' ? "Ishchi bilan bog'lanish" : language === 'ru' ? "Связаться с работником" : "Contact Worker"}</span>
          </button>
        ) : (
          <button
            disabled
            className="w-full py-2.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
          >
            {language === 'uz' ? "Rad etilgan" : language === 'ru' ? "Отклонено" : "Rejected"}
          </button>
        )}
      </div>
    </motion.div>
  );
};
