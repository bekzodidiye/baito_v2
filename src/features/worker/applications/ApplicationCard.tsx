import React from 'react';
import { MapPin, Calendar, Clock, ChevronRight, Building } from 'lucide-react';
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
  const getStatusText = (status: string, lang: Language) => {
    switch (status) {
      case 'applied':
        return lang === 'uz' ? 'Kutilmoqda' : lang === 'ru' ? 'В ожидании' : 'Pending';
      case 'hired':
        return lang === 'uz' ? 'Qabul qilindi' : lang === 'ru' ? 'Принят' : 'Hired';
      case 'rejected':
        return lang === 'uz' ? 'Rad etildi' : lang === 'ru' ? 'Отклонен' : 'Rejected';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'hired':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

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

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-display font-bold text-slate-800 text-sm leading-tight mb-1 group-hover:text-brand-primary transition-colors">
            {application.jobTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Building size={13} className="shrink-0" />
            <span className="truncate max-w-[150px]">{application.jobCompany}</span>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(application.status)}`}>
          {getStatusText(application.status, language)}
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className="truncate font-medium">{application.jobDate}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{application.jobLocation}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock size={12} />
          <span>{language === 'uz' ? 'Topshirildi: ' : language === 'ru' ? 'Подано: ' : 'Applied: '} {formatDate(application.appliedDate)}</span>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
          <ChevronRight size={14} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
        </div>
      </div>
    </div>
  );
};
