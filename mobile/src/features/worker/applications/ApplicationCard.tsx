import React from 'react';
import { MapPin, Calendar, Clock, ChevronRight, Building2, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Language } from '../../../translations';

interface ApplicationCardProps {
  application: {
    id: string;
    jobId: string;
    jobTitle: string;
    jobCompany: string;
    jobLocation: string;
    jobDate: string;
    status: string;
    appliedDate: string | null;
  };
  language: Language;
  onClick: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, language, onClick }) => {
  const getStatusConfig = (status: string, lang: Language) => {
    switch (status) {
      case 'applied':
        return {
          text: lang === 'uz' ? 'Kutilmoqda' : lang === 'ru' ? 'В ожидании' : 'Pending',
          bg: 'bg-amber-50',
          textCol: 'text-amber-600',
          borderCol: 'border-amber-200',
          gradient: 'from-amber-400 to-orange-500',
          icon: <Clock3 size={12} className="mr-1" />
        };
      case 'hired':
        return {
          text: lang === 'uz' ? 'Qabul qilindi' : lang === 'ru' ? 'Принят' : 'Hired',
          bg: 'bg-emerald-50',
          textCol: 'text-emerald-600',
          borderCol: 'border-emerald-200',
          gradient: 'from-emerald-400 to-teal-500',
          icon: <CheckCircle2 size={12} className="mr-1" />
        };
      case 'rejected':
        return {
          text: lang === 'uz' ? 'Rad etildi' : lang === 'ru' ? 'Отклонен' : 'Rejected',
          bg: 'bg-rose-50',
          textCol: 'text-rose-600',
          borderCol: 'border-rose-200',
          gradient: 'from-rose-400 to-red-500',
          icon: <XCircle size={12} className="mr-1" />
        };
      default:
        return {
          text: status,
          bg: 'bg-slate-50',
          textCol: 'text-slate-600',
          borderCol: 'border-slate-200',
          gradient: 'from-slate-400 to-slate-500',
          icon: <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
        };
    }
  };

  const config = getStatusConfig(application.status, language);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Extract initials for the avatar
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div 
      onClick={onClick}
      className="relative bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group active:scale-[0.98] overflow-hidden"
    >
      {/* Decorative Gradient Line */}
      <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${config.gradient}`} />

      <div className="flex justify-between items-start mb-4 pl-1">
        <div className="flex items-center gap-3">
          {/* Modern Avatar */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/50 flex items-center justify-center shrink-0 shadow-sm text-slate-500 font-display font-black text-sm">
            {getInitials(application.jobCompany)}
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base leading-tight mb-0.5 group-hover:text-brand-primary transition-colors line-clamp-1">
              {application.jobTitle}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Building2 size={11} className="shrink-0" />
              <span className="truncate max-w-[120px]">{application.jobCompany}</span>
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center px-2.5 py-1 rounded-full border ${config.bg} ${config.borderCol} ${config.textCol} text-[10px] font-black uppercase tracking-widest shadow-sm`}>
          {config.icon}
          {config.text}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mb-4 pl-1 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className="truncate font-semibold">{application.jobDate}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{application.jobLocation}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 pl-1">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          <Clock size={12} />
          <span>{language === 'uz' ? 'Topshirildi: ' : language === 'ru' ? 'Подано: ' : 'Applied: '} {formatDate(application.appliedDate)}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-300 shadow-sm">
          <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
};
