import React from 'react';
import { Plus } from 'lucide-react';

interface EmployerPageHeaderProps {
  title: string;
  description: string;
  language: 'uz' | 'ru' | 'en';
  onPostJobClick?: () => void;
  showPostButton?: boolean;
}

export const EmployerPageHeader: React.FC<EmployerPageHeaderProps> = ({
  title,
  description,
  language,
  onPostJobClick,
  showPostButton = true
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <h1 className="font-display text-xl font-black text-slate-800">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {description}
        </p>
      </div>
      {showPostButton && onPostJobClick && (
        <button
          onClick={onPostJobClick}
          className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-display font-black text-xs rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer outline-none self-start md:self-auto shrink-0"
        >
          <Plus size={15} className="stroke-[2.5]" />
          <span>{language === 'uz' ? "Yangi e'lon joylash" : language === 'ru' ? "Создать объявление" : "Post new job"}</span>
        </button>
      )}
    </div>
  );
};
