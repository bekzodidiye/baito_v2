import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { Briefcase, History, Clock, Wallet, Hourglass, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';
import { EmployerJobDetailModal } from './EmployerJobDetailModal';
import { EmployerJobCard } from './EmployerJobCard';
import { EmployerPayInvoiceModal } from './EmployerPayInvoiceModal';
import { FinishJobModal } from './components/FinishJobModal';
import { LoadingOrb } from "@/components/ui/loading-orb";
import { Job } from '../../types';

interface EmployerJobsProps {
  onPostJobClick: () => void;
}

export const EmployerJobs: React.FC<EmployerJobsProps> = ({ onPostJobClick }) => {
  const { postedJobs, language, completeJob, deleteJob, confirmStartJob } = useEmployer();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'open' | 'active' | 'awaiting_payment' | 'awaiting_confirmation' | 'history'
  >('open');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null);
  const [jobToPay, setJobToPay] = useState<Job | null>(null);

  const handleFinishConfirm = async (data: { rating: number; review: string; bonus: number }) => {
    if (jobToComplete) {
      await completeJob(jobToComplete.id, data);
      setJobToComplete(null);
    }
  };

  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const openJobs = useMemo(() => postedJobs.filter(j => j.status === 'open'), [postedJobs]);
  const activeJobs = useMemo(() => {
    return postedJobs
      .filter(j => ['confirmed', 'in_progress', 'start_requested'].includes(j.status))
      .sort((a, b) => {
        if (a.status === 'start_requested' && b.status !== 'start_requested') return -1;
        if (b.status === 'start_requested' && a.status !== 'start_requested') return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [postedJobs]);
  // Settlement, which runs on after the work itself is done. A finished job
  // sits in awaiting_payment from the moment an administrator raises the
  // invoice, moves to awaiting_confirmation when the employer says they have
  // paid, and only reaches history once an administrator has matched that
  // against the bank statement. Driven by payoutStatus rather than job.status,
  // because the work being over and the bill being settled are two different
  // facts about the same job.
  const awaitingPaymentJobs = useMemo(
    () => postedJobs.filter(j => j.payoutStatus === 'invoiced'),
    [postedJobs],
  );
  const awaitingConfirmationJobs = useMemo(
    () => postedJobs.filter(j => j.payoutStatus === 'payment_declared'),
    [postedJobs],
  );
  // A job whose bill is still open belongs in one of the two buckets above, not
  // in history - otherwise it looks finished while money is outstanding.
  const historyJobs = useMemo(
    () => postedJobs.filter(j =>
      ['completed', 'cancelled', 'closed'].includes(j.status)
      && j.payoutStatus !== 'invoiced'
      && j.payoutStatus !== 'payment_declared'),
    [postedJobs],
  );

  const displayJobs =
    activeTab === 'open' ? openJobs
    : activeTab === 'active' ? activeJobs
    : activeTab === 'awaiting_payment' ? awaitingPaymentJobs
    : activeTab === 'awaiting_confirmation' ? awaitingConfirmationJobs
    : historyJobs;

  const [searchQuery, setSearchQuery] = useState('');

  const searchedJobs = useMemo(() => {
    if (!searchQuery.trim()) return displayJobs;
    const q = searchQuery.toLowerCase().trim();
    return displayJobs.filter(j => {
      const trans = j.translations?.[language] || {};
      const allTransText = Object.values(j.translations || {}).flatMap(t => [t.title, t.description, t.location]).filter(Boolean).join(' ').toLowerCase();
      return (
        (j.title && j.title.toLowerCase().includes(q)) ||
        (trans.title && trans.title.toLowerCase().includes(q)) ||
        (j.category && j.category.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        (trans.location && trans.location.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        allTransText.includes(q)
      );
    });
  }, [displayJobs, searchQuery]);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeTab, searchedJobs.length]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < searchedJobs.length) {
        setVisibleCount(prev => prev + 12);
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, searchedJobs.length]);

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? "Ish boshqaruvi" : language === 'ru' ? "Управление работами" : "Job management"}
        description={language === 'uz' ? "Barcha e'lonlaringizni shu yerdan boshqaring" : language === 'ru' ? "Управляйте всеми своими объявлениями здесь" : "Manage all your job posts here"}
        language={language}
        onPostJobClick={onPostJobClick}
      />

      {/* Tabs. Five of them now, so they come from a list rather than five
          near-identical blocks - the pair in the middle is settlement, which
          runs on after the work is finished.

          No width cap of its own. It was `max-w-3xl` — 768px — while the five
          Uzbek labels need 875px, so "Tarix" sat 107px off the right edge on
          every screen, behind a sideways scroll with nothing to say it was
          there. The page it sits on is already `max-w-6xl`; inside that the
          strip has 1104px and all five fit with room to spare. `overflow-x-auto`
          stays for the phones, where five columns genuinely will not fit. */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-1 p-1.5 bg-slate-100/80 rounded-2xl w-full mt-2 mb-2 relative z-10 overflow-x-auto">
        {([
          { id: 'open' as const, icon: Clock, count: openJobs.length, tone: 'text-brand-primary', badge: 'bg-brand-primary/10 text-brand-primary',
            label: language === 'uz' ? "Ochiq" : language === 'ru' ? "Открытые" : "Open" },
          { id: 'active' as const, icon: Briefcase, count: activeJobs.length, tone: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600',
            label: language === 'uz' ? "Jarayonda" : language === 'ru' ? "В процессе" : "Active" },
          { id: 'awaiting_payment' as const, icon: Wallet, count: awaitingPaymentJobs.length, tone: 'text-amber-600', badge: 'bg-amber-50 text-amber-600',
            label: language === 'uz' ? "To'lov kutilmoqda" : language === 'ru' ? "Ожидает оплаты" : "Awaiting payment" },
          { id: 'awaiting_confirmation' as const, icon: Hourglass, count: awaitingConfirmationJobs.length, tone: 'text-sky-600', badge: 'bg-sky-50 text-sky-600',
            label: language === 'uz' ? "Tasdiqlanishi kutilmoqda" : language === 'ru' ? "Ожидает подтверждения" : "Awaiting confirmation" },
          { id: 'history' as const, icon: History, count: historyJobs.length, tone: 'text-slate-800', badge: 'bg-slate-100 text-slate-800',
            label: language === 'uz' ? "Tarix" : language === 'ru' ? "История" : "History" },
        ]).map(tab => {
          const Icon = tab.icon;
          const on = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${
                on ? `bg-white ${tab.tone} shadow-sm` : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={16} className={`shrink-0 ${on ? 'stroke-[2.5]' : ''}`} />
              <span className="truncate">{tab.label}</span>
              <span className={`ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${on ? tab.badge : 'bg-slate-200 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {displayJobs.length > 0 && (
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'uz' ? "E'lon nomi, kasb yoki manzil bo'yicha qidirish..." : language === 'ru' ? "Поиск по названию, профессии или адресу..." : "Search by title, profession or address..."}
            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 rounded-xl py-2.5 pl-11 pr-10 text-xs font-semibold placeholder:text-slate-400 text-slate-800 transition-all outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Job Grid */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
        {searchedJobs.length === 0 ? (
          <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200/60 py-16 px-6 flex flex-col items-center justify-center text-center mt-4">
            {activeTab === 'open' ? (
              <Clock size={40} className="text-slate-300 stroke-[1.5] mb-4" />
            ) : activeTab === 'active' ? (
              <Briefcase size={40} className="text-slate-300 stroke-[1.5] mb-4" />
            ) : (
              <History size={40} className="text-slate-300 stroke-[1.5] mb-4" />
            )}
            <p className="text-sm font-extrabold text-slate-600">
              {searchQuery.trim()
                ? (language === 'uz' ? "Qidiruv bo'yicha mos e'lon topilmadi" : language === 'ru' ? "По вашему запросу объявлений не найдено" : "No matching jobs found")
                : activeTab === 'open' 
                ? (language === 'uz' ? "Ishchilar kutilayotgan ishlar yo'q" : language === 'ru' ? "Нет работ, ожидающих работников" : "No pending jobs")
                : activeTab === 'active'
                ? (language === 'uz' ? "Jarayondagi ishlar yo'q" : language === 'ru' ? "Нет работ в процессе" : "No active jobs")
                : (language === 'uz' ? "Tarix bo'sh" : language === 'ru' ? "История пуста" : "History is empty")
              }
            </p>
            <p className="text-[11px] text-slate-400 font-medium max-w-[260px] mt-2 leading-relaxed">
              {searchQuery.trim()
                ? (language === 'uz' ? "Boshqa so'z bilan qidirib ko'ring yoki filtrlarni tozalang." : language === 'ru' ? "Попробуйте изменить поисковый запрос." : "Try a different search query.")
                : activeTab === 'open'
                ? (language === 'uz' ? "Siz yaratgan e'lonlaringiz shu yerda ko'rinadi." : language === 'ru' ? "Ваши новые объявления будут отображаться здесь." : "Your open jobs will appear here.")
                : activeTab === 'active'
                ? (language === 'uz' ? "Siz ishchilar bilan kelishgan ishlar shu yerda bo'ladi." : language === 'ru' ? "Работы, на которые вы наняли людей, будут здесь." : "Jobs with hired workers will appear here.")
                : (language === 'uz' ? "Yakunlangan ishlaringiz shu yerda ko'rinadi." : language === 'ru' ? "Завершенные работы будут отображаться здесь." : "Completed jobs will appear here.")
              }
            </p>
            {activeTab === 'open' && !searchQuery && (
              <button
                onClick={onPostJobClick}
                className="mt-5 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-xl shadow-[0_4px_14px_rgba(0,6,102,0.18)] transition-all cursor-pointer"
              >
                {language === 'uz' ? "Yangi e'lon yaratish" : language === 'ru' ? "Создать новое объявление" : "Create new job"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-5 items-stretch">
              {searchedJobs.slice(0, visibleCount).map(job => (
                <EmployerJobCard
                  key={job.id}
                  job={job}
                  language={language}
                  onSelect={setSelectedJob}
                  onComplete={() => setJobToComplete(job)}
                  onDelete={deleteJob}
                  onConfirmStart={() => confirmStartJob(job.id)}
                  onPayInvoice={setJobToPay}
                />
              ))}
            </div>
            {/* Intersection Observer target */}
            {visibleCount < searchedJobs.length && (
              <div ref={loadMoreRef} className="w-full h-20 flex items-center justify-center">
                <LoadingOrb size="sm" variant="working" />
              </div>
            )}
          </div>
        )}
        </motion.div>
      </AnimatePresence>

      {/* Detailed Modal */}
      <EmployerJobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        language={language}
        onComplete={(id) => {
          setSelectedJob(null);
          const j = postedJobs.find(x => x.id === id);
          if (j) setJobToComplete(j);
        }}
        onDelete={deleteJob}
        onConfirmStart={(id) => {
          confirmStartJob(id);
          setSelectedJob(null);
        }}
      />

      {/* Finish Job Modal */}
      <FinishJobModal
        isOpen={!!jobToComplete}
        onClose={() => setJobToComplete(null)}
        onConfirm={handleFinishConfirm}
        jobTitle={jobToComplete?.title || ''}
        jobId={jobToComplete?.id}
        language={language}
      />

      {/* Settling an invoice. Refetching employer-jobs on success is what moves
          the card out of "To'lov kutilmoqda" and into "Tasdiqlanishi
          kutilmoqda" - the tab it belongs to is derived from payoutStatus, so
          the list has to be reloaded rather than patched locally. */}
      <EmployerPayInvoiceModal
        job={jobToPay}
        language={language}
        onClose={() => setJobToPay(null)}
        onDeclared={() => queryClient.invalidateQueries({ queryKey: ['employer-jobs'] })}
      />
    </div>
  );
};
