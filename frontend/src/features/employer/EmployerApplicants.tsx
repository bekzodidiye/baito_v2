import React from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { ClipboardCheck, CheckCircle2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { ApplicantCard } from './components/ApplicantCard';

interface EmployerApplicantsProps {
  onChatClick: (candidateName: string) => void;
}

export const EmployerApplicants: React.FC<EmployerApplicantsProps> = ({ onChatClick }) => {
  const { applications, updateApplicationStatus, language } = useEmployer();
  
  const activeApps = applications;
  const pendingApps = activeApps.filter(app => app.status === 'applied');

  const handleBulkApprove = () => {
    if (confirm(language === 'uz' ? 'Barcha arizalarni tasdiqlaysizmi?' : language === 'ru' ? 'Подтвердить все заявки?' : 'Approve all applications?')) {
      pendingApps.forEach(app => {
        updateApplicationStatus(app.id, 'hired');
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? "Arizalar va Nomzodlar" : language === 'ru' ? "Заявки и Кандидаты" : "Applicants & Candidates"}
        description={language === 'uz' ? "Sizning e'lonlaringizga ariza topshirgan faol nomzodlar ro'yxati" : language === 'ru' ? "Список кандидатов, подавших заявки на ваши объявления" : "List of candidates who applied for your jobs"}
        language={language}
        showPostButton={false}
      />

      {pendingApps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex justify-end mt-[-10px]">
          <button 
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            <CheckCircle2 size={16} className="stroke-[2.5]" />
            {language === 'uz' ? `Barchasini tasdiqlash (${pendingApps.length})` : language === 'ru' ? `Одобрить все (${pendingApps.length})` : `Approve all (${pendingApps.length})`}
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      {activeApps.length === 0 ? (
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 py-20 px-6 flex flex-col items-center justify-center text-center mt-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
          <div className="w-20 h-20 bg-blue-50/80 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100/50 relative">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-full animate-ping opacity-75"></div>
            <ClipboardCheck size={36} className="text-brand-primary stroke-[1.5] relative z-10" />
          </div>
          <h3 className="text-xl font-display font-black text-slate-800 mb-2">
            {language === 'uz' ? "Hozircha arizalar yo'q" : language === 'ru' ? "Пока нет поданных заявок" : "No applications yet"}
          </h3>
          <p className="text-sm text-slate-500 font-medium max-w-[320px] leading-relaxed">
            {language === 'uz' ? "Yangi ishchilar ariza topshirishi bilan ular shu yerda paydo bo'ladi. E'lonlaringiz faolligiga ishonch hosil qiling." : language === 'ru' ? "Как только работники подадут заявки, они отобразятся здесь. Убедитесь, что ваши объявления активны." : "As soon as workers apply, they will appear here. Ensure your jobs are active."}
          </p>
          <button className="mt-8 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-2">
            <Search size={16} />
            {language === 'uz' ? "Boshqa ishchilarni qidirish" : language === 'ru' ? "Искать других работников" : "Search other workers"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
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
      </motion.div>
    </div>
  );
};
