import React from 'react';
import { ArrowLeft, Share2, MoreVertical } from 'lucide-react';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { translations } from '../../translations';

interface JobDetailsHeaderProps {
  selectedJob: Job;
  onClose: () => void;
}

export const JobDetailsHeader: React.FC<JobDetailsHeaderProps> = ({
  selectedJob,
  onClose,
}) => {
  const { language } = useApp();
  const t = translations[language];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: selectedJob.title,
        text: `${selectedJob.title} - ${selectedJob.company}`,
        url: `${window.location.origin}/?jobId=${selectedJob.id}`
      }).catch((error) => console.log('Error sharing', error));
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/?jobId=${selectedJob.id}`);
    }
    window.dispatchEvent(new CustomEvent("global-toast", { 
      detail: language === 'uz' ? "E'lon havolasi nusxalandi!" : language === 'ru' ? "Ссылка скопирована!" : "Link copied!" 
    }));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-14 md:h-16 flex items-center px-4 md:px-6 justify-between shrink-0 rounded-t-3xl sm:rounded-t-none sm:rounded-tl-3xl">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onClose}
          aria-label={t.back || "Orqaga"}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-brand-primary transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" aria-hidden="true" />
        </button>
        <h1 className="text-base font-bold text-brand-primary truncate tracking-tight">
          {t.jobDetailsTitle || (language === 'uz' ? "Ish tafsilotlari" : language === 'ru' ? "Детали работы" : "Job Details")}
        </h1>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button 
          type="button"
          onClick={handleShare}
          aria-label={t.share || "Ulashish"}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          title={t.share || "Ulashish"}
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
        <button 
          type="button"
          onClick={handleCopyLink} 
          aria-label={language === 'ru' ? 'Копировать ссылку' : language === 'en' ? 'Copy link' : "Nusxa olish"}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          title={language === 'ru' ? 'Копировать' : language === 'en' ? 'Copy' : "Nusxa olish"}
        >
          <MoreVertical size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
