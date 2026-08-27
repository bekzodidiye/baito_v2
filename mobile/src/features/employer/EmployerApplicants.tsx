import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { ClipboardCheck, CheckCircle2, Search, Inbox, Briefcase, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { ApplicantCard } from './components/ApplicantCard';

interface EmployerApplicantsProps {
  onChatClick: (candidateName: string) => void;
}

export const EmployerApplicants: React.FC<EmployerApplicantsProps> = ({ onChatClick }) => {
  const { applications, updateApplicationStatus, language } = useEmployer();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  
  const pendingApps = applications.filter(app => app.status === 'applied');
  const activeWorkers = applications
    .filter(app => app.status === 'hired' || app.status === 'start_requested' || app.status === 'approved')
    .sort((a, b) => {
      if (a.status === 'start_requested' && b.status !== 'start_requested') return -1;
      if (b.status === 'start_requested' && a.status !== 'start_requested') return 1;
      return new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime();
    });
  const historyApps = applications.filter(app => app.status === 'completed' || app.status === 'rejected');

  const displayedApps = activeTab === 'pending' ? pendingApps : activeTab === 'active' ? activeWorkers : historyApps;

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

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full max-w-xl mx-auto mt-[-10px] relative z-10">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${activeTab === 'pending' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Inbox size={16} className={`shrink-0 ${activeTab === 'pending' ? 'stroke-[2.5]' : ''}`} />
          <span className="truncate">{language === 'uz' ? "Yangi" : language === 'ru' ? "Новые" : "New"}</span>
          {pendingApps.length > 0 && (
            <span className={`ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'pending' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200 text-slate-500'}`}>
              {pendingApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${activeTab === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase size={16} className={`shrink-0 ${activeTab === 'active' ? 'stroke-[2.5]' : ''}`} />
          <span className="truncate">{language === 'uz' ? "Jarayonda" : language === 'ru' ? "В процессе" : "Active"}</span>
          {activeWorkers.length > 0 && (
            <span className={`ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
              {activeWorkers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={16} className={`shrink-0 ${activeTab === 'history' ? 'stroke-[2.5]' : ''}`} />
          <span className="truncate">{language === 'uz' ? "Tarix" : language === 'ru' ? "История" : "History"}</span>
        </button>
      </div>

      {activeTab === 'pending' && pendingApps.length > 0 && (
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

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {displayedApps.length === 0 ? (
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 py-20 px-6 flex flex-col items-center justify-center text-center mt-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
              <div className="w-20 h-20 bg-blue-50/80 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100/50 relative">
                <div className="absolute inset-0 bg-brand-primary/5 rounded-full animate-ping opacity-75"></div>
                <ClipboardCheck size={36} className="text-brand-primary stroke-[1.5] relative z-10" />
              </div>
              <h3 className="text-xl font-display font-black text-slate-800 mb-2">
                {activeTab === 'pending' 
                  ? (language === 'uz' ? "Hozircha yangi arizalar yo'q" : language === 'ru' ? "Пока нет новых заявок" : "No new applications yet")
                  : activeTab === 'active'
                  ? (language === 'uz' ? "Jarayondagi ishchilar yo'q" : language === 'ru' ? "Нет активных работников" : "No active workers")
                  : (language === 'uz' ? "Tarix bo'sh" : language === 'ru' ? "История пуста" : "History is empty")
                }
              </h3>
              <p className="text-sm text-slate-500 font-medium max-w-[320px] leading-relaxed">
                {activeTab === 'pending' 
                  ? (language === 'uz' ? "Yangi ishchilar ariza topshirishi bilan ular shu yerda paydo bo'ladi." : language === 'ru' ? "Как только работники подадут заявки, они отобразятся здесь." : "As soon as workers apply, they will appear here.")
                  : (language === 'uz' ? "Siz tasdiqlagan yoki jarayondagi ishlar shu yerda chiqadi." : language === 'ru' ? "Одобренные вами заявки появятся здесь." : "Your approved applications will appear here.")
                }
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
              {displayedApps.map((app) => (
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
      </AnimatePresence>
    </div>
  );
};
