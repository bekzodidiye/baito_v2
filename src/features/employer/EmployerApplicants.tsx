import React from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { ClipboardCheck } from 'lucide-react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { ApplicantCard } from './components/ApplicantCard';

interface EmployerApplicantsProps {
  onChatClick: (candidateName: string) => void;
}

export const EmployerApplicants: React.FC<EmployerApplicantsProps> = ({ onChatClick }) => {
  const { applications, updateApplicationStatus, language } = useEmployer();
  
  const activeApps = applications;

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? "Arizalar va Nomzodlar" : language === 'ru' ? "Заявки и Кандидаты" : "Applicants & Candidates"}
        description={language === 'uz' ? "Sizning e'lonlaringizga ariza topshirgan faol nomzodlar ro'yxati" : language === 'ru' ? "Список кандидатов, подавших заявки на ваши объявления" : "List of candidates who applied for your jobs"}
        language={language}
        showPostButton={false}
      />

      {activeApps.length === 0 ? (
        <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200/60 py-16 px-6 flex flex-col items-center justify-center text-center mt-4">
          <ClipboardCheck size={40} className="text-slate-300 stroke-[1.5] mb-4" />
          <p className="text-sm font-extrabold text-slate-600">
            {language === 'uz' ? "Hozircha arizalar yo'q" : language === 'ru' ? "Пока нет поданных заявок" : "No applications yet"}
          </p>
          <p className="text-[11px] text-slate-400 font-medium max-w-[260px] mt-2 leading-relaxed">
            {language === 'uz' ? "Yangi ishchilar ariza topshirishi bilan ular shu yerda paydo bo'ladi" : language === 'ru' ? "Как только работники подадут заявки, они отобразятся здесь" : "As soon as workers apply, they will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {activeApps.map((app) => (
            <ApplicantCard
              key={app.id}
              app={app}
              language={language}
              updateApplicationStatus={updateApplicationStatus}
              onChatClick={onChatClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
