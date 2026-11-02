import React, { useState, useEffect } from 'react';
import { money } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import { Orb } from "@/components/ui/thinking-orbs";
import { apiClient } from '../../api/client';
import { 
  X, 
  Users, 
  Calendar, 
  MapPin, 
  CheckCircle2,
  Zap,
  Briefcase,
  DollarSign,
  Timer,
  Building2,
  User,
  FileText,
  CreditCard,
  History,
  Star,
  Eye,
  Plus,
  UserCheck,
  Banknote,
  Circle,
  XCircle,
  ListChecks,
  Copy,
  Check,
  Phone,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { AdminJob, AdminJobDetailResponse, AdminJobApplication, AdminJobTransaction, AdminTimelineEvent, AdminJobStep } from './types';

interface JobDetailModalProps {
  job: AdminJob | null;
  onClose: () => void;
}

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const statusLabels: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open: { label: 'Ariza ochiq', bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  confirmed: { label: 'Ishchi olindi', bg: 'bg-brand-primary/10 border-brand-primary/20', text: 'text-brand-primary', dot: 'bg-brand-primary' },
  in_progress: { label: 'Ish boshlandi', bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Ish tugatildi', bg: 'bg-indigo-50 border-indigo-200/80', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  cancelled: { label: 'Ish bekor qilindi', bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', dot: 'bg-rose-500' },
  dispute: { label: 'Nizo mavjud', bg: 'bg-orange-50 border-orange-200/80', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const appStatusLabels: Record<string, { label: string; color: string }> = {
  applied: { label: 'Ariza yubordi', color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' },
  hired: { label: 'Qabul qilindi', color: 'text-emerald-700 bg-emerald-50 border-emerald-200/60' },
  completed: { label: 'Yakunlandi', color: 'text-slate-700 bg-slate-100 border-slate-200/60' },
  rejected: { label: 'Rad etildi', color: 'text-rose-700 bg-rose-50 border-rose-200/60' },
};

const txnTypeLabels: Record<string, string> = {
  deposit: 'Depozit',
  payment: "To'lov",
  withdraw: 'Yechib olish',
};

const txnStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Kutilmoqda', color: 'text-amber-700 bg-amber-50 border-amber-200/60' },
  paid: { label: "To'langan", color: 'text-emerald-700 bg-emerald-50 border-emerald-200/60' },
  canceled: { label: 'Bekor qilingan', color: 'text-rose-700 bg-rose-50 border-rose-200/60' },
};

type TabKey = 'info' | 'timeline' | 'applications' | 'payments';

const adminText = () => ADMIN_TEXTS[useAuthStore.getState().language] || ADMIN_TEXTS.uz;
const adminLang = () => useAuthStore.getState().language;

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [detail, setDetail] = useState<AdminJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!job) return;
    setLoading(true);
    apiClient(`/admin/jobs/${job.id}/detail`)
      .then(data => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [job?.id]);

  if (!job) return null;

  const j = detail?.job || job;
  const status = statusLabels[j.status] || statusLabels.open;
  const tasks = j.responsibilities ? j.responsibilities.split('\n').filter(Boolean) : [];
  const requirements = j.requirements ? j.requirements.split('\n').filter(Boolean) : [];
  const bannerUrl = j.imageUrl || 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80';

  const handleCopyId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(j.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'info', label: "Ma'lumot", icon: <FileText size={15} /> },
    { key: 'timeline', label: 'Tarix', icon: <History size={15} />, count: detail?.timeline?.length },
    { key: 'applications', label: 'Arizalar', icon: <Users size={15} />, count: detail?.applications?.length },
    { key: 'payments', label: "To'lovlar", icon: <CreditCard size={15} />, count: detail?.transactions?.length },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-slate-200/90 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-white border-b border-slate-100 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-slate-100 shrink-0 border border-transparent hover:border-slate-200"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ish Tafsilotlari</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400 font-mono font-medium">#{j.id.slice(0, 8)}</span>
                  <button
                    onClick={handleCopyId}
                    className="text-[11px] text-brand-primary hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="ID nusxalash"
                  >
                    {copiedId ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <Check size={11} /> Nusxalandi
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <Copy size={11} /> Nusxalash
                      </span>
                    )}
                  </button>
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate mt-0.5">{j.title}</h2>
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs shrink-0 ${status.bg} ${status.text}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot} ${j.status === 'in_progress' ? 'animate-pulse' : ''}`} />
              <span>{status.label}</span>
            </div>
          </div>

          {/* Segmented Tab Navigation */}
          <div className="px-4 sm:px-6 pt-3 pb-2.5 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200/60">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-white text-brand-primary shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === tab.key ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/70">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Orb state="working" size={32} className="text-brand-primary" />
                <p className="text-xs font-bold text-slate-400 animate-pulse">Ma'lumotlar yuklanmoqda...</p>
              </div>
            ) : (
              <>
                {activeTab === 'info' && <InfoTab j={j} tasks={tasks} requirements={requirements} bannerUrl={bannerUrl} detail={detail} />}
                {activeTab === 'timeline' && <TimelineTab timeline={detail?.timeline || []} />}
                {activeTab === 'applications' && <ApplicationsTab applications={detail?.applications || []} />}
                {activeTab === 'payments' && <PaymentsTab transactions={detail?.transactions || []} />}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[11px] font-mono font-medium">ID: #{j.id.slice(0, 8)}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[11px] text-brand-primary font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                {copiedId ? "Nusxalandi!" : "Nusxalash"}
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              Yopish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* ========================= INFO TAB ========================= */
interface InfoTabProps {
  j: AdminJob & { employerPhone?: string };
  tasks: string[];
  requirements: string[];
  bannerUrl: string;
  detail: AdminJobDetailResponse | null;
}

const stepStyles: Record<AdminJobStep['state'], { ring: string; fill: string; label: string; date: string }> = {
  done:      { ring: 'border-emerald-500 bg-emerald-500', fill: 'text-white', label: 'text-slate-800', date: 'text-slate-400' },
  current:   { ring: 'border-brand-primary bg-white ring-4 ring-brand-primary/10', fill: 'text-brand-primary', label: 'text-brand-primary font-extrabold', date: 'text-brand-primary/70' },
  pending:   { ring: 'border-slate-300 bg-white', fill: 'text-slate-300', label: 'text-slate-500', date: 'text-slate-300' },
  skipped:   { ring: 'border-slate-200 bg-slate-100', fill: 'text-slate-400', label: 'text-slate-400', date: 'text-slate-300' },
  cancelled: { ring: 'border-rose-400 bg-rose-50', fill: 'text-rose-500', label: 'text-rose-600', date: 'text-rose-400' },
};

const JobSteps: React.FC<{ steps: AdminJobStep[] }> = ({ steps }) => {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;
  const done = steps.filter(s => s.state === 'done').length;
  const total = steps.filter(s => s.state !== 'cancelled').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentStep = steps.find(s => s.state === 'current') || steps.filter(s => s.state === 'done').slice(-1)[0] || steps[0];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <ListChecks size={13} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">Ish Jarayoni</span>
        </div>
        <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
          {done} / {total} ({percent}%)
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
        <div 
          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
          style={{ width: `${percent}%` }} 
        />
      </div>

      {/* Current Step Spotlight */}
      {currentStep && (
        <div className="bg-slate-50/80 p-2.5 px-3 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Joriy bosqich</span>
              <span className="text-xs font-black text-slate-800 truncate block">{currentStep.label}</span>
            </div>
          </div>
          {currentStep.date && (
            <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
              {formatDate(currentStep.date)}
            </span>
          )}
        </div>
      )}

      {/* Expand / Collapse Full Stepper */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-bold text-brand-primary hover:text-brand-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{expanded ? "Bosqichlarni yashirish" : `Barcha bosqichlar (${steps.length} ta)`}</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[10px] text-slate-400 font-medium">Batafsil xronologiya</span>
      </div>

      {/* Expanded full steps */}
      {expanded && (
        <ol className="relative pl-1 space-y-2.5 mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
          {steps.map((step, idx) => {
            const st = stepStyles[step.state] || stepStyles.pending;
            const last = idx === steps.length - 1;
            return (
              <li key={step.key} className="flex gap-2.5 pb-2.5 last:pb-0 relative">
                {!last && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[10px] top-5 bottom-0 w-0.5 ${
                      step.state === 'done' ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
                <span
                  className={`w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    step.state === 'done'
                      ? 'bg-emerald-500 text-white shadow-2xs ring-2 ring-emerald-100'
                      : step.state === 'current'
                      ? 'bg-brand-primary text-white shadow-2xs ring-4 ring-brand-primary/15 animate-pulse'
                      : step.state === 'cancelled'
                      ? 'bg-rose-500 text-white ring-2 ring-rose-100'
                      : 'bg-white border-2 border-slate-300 text-slate-300'
                  }`}
                >
                  {step.state === 'done' ? (
                    <CheckCircle2 size={11} className="text-white" strokeWidth={2.5} />
                  ) : step.state === 'current' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  ) : step.state === 'cancelled' ? (
                    <XCircle size={11} className="text-white" strokeWidth={2.5} />
                  ) : (
                    <Circle size={5} className="text-slate-300" fill="currentColor" />
                  )}
                </span>
                <div className="min-w-0 flex-1 -mt-0.5">
                  <p className={`text-xs font-bold leading-snug ${st.label}`}>{step.label}</p>
                  {(step.date || step.detail) && (
                    <p className={`text-[10px] font-medium mt-0.5 ${st.date}`}>
                      {step.detail && <span>{step.detail}</span>}
                      {step.detail && step.date && <span className="mx-1">·</span>}
                      {step.date && <span>{formatDate(step.date)}</span>}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

const InfoTab: React.FC<InfoTabProps> = ({ j, tasks, requirements, bannerUrl, detail }) => {
  const language = adminLang();
  const salaryFormatted = money(j.salary, language);

  return (
    <div className="pb-8">
      {/* Sleek Compact Hero Cover */}
      <div className="mx-4 sm:mx-5 mt-4 rounded-3xl overflow-hidden relative bg-slate-100 border border-slate-200/80 shadow-2xs h-32 sm:h-36">
        <img
          src={bannerUrl}
          alt={j.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            const fallback = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80';
            if (target.src !== fallback) target.src = fallback;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
        
        {/* Banner Overlays Top */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 border border-white/10 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {j.category || adminText().jobTypeFallback || 'Kategoriya'}
          </span>
          {j.urgent && (
            <span className="bg-rose-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 border border-rose-400/20 shadow-xs animate-pulse">
              <Sparkles size={10} />
              Zudlik
            </span>
          )}
        </div>

        {j.views !== undefined && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 border border-white/10 shadow-xs">
            <Eye size={11} /> {j.views} ko'rildi
          </div>
        )}

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 drop-shadow-sm">
            <Building2 size={13} className="text-slate-300 shrink-0" />
            <span className="truncate">{j.company || j.employerName || '—'}</span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 mt-3.5 space-y-3.5">
        {/* 2x2 Bento Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={<DollarSign size={15} className="text-emerald-600" />}
            bg="bg-emerald-50"
            label={adminText().salaryLabel}
            value={salaryFormatted}
            color="text-emerald-700 font-extrabold"
          />
          <StatCard
            icon={<Zap size={15} className="text-amber-600" />}
            bg="bg-amber-50"
            label="Soatlik stavka"
            value={j.hourlyRate ? `${j.hourlyRate} / soat` : "Yo'q"}
            color="text-amber-700 font-bold"
          />
          <StatCard
            icon={<Calendar size={15} className="text-brand-primary" />}
            bg="bg-brand-primary/10"
            label={adminText().dateLabel}
            value={j.workDate || '—'}
          />
          <StatCard
            icon={<Timer size={15} className="text-indigo-600" />}
            bg="bg-indigo-50"
            label={adminText().timeLabel}
            value={j.workTime || '—'}
          />
        </div>

        {/* Stepper */}
        <JobSteps steps={detail?.steps || []} />

        {/* Employer & Hired Worker Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Employer Card */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 shadow-2xs">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{adminText().roleEmployer}</span>
                <span className="text-xs font-black text-slate-900 block truncate mt-0.5">{j.employerName || j.company || '—'}</span>
                {(j as any).employerPhone && (
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block truncate">{(j as any).employerPhone}</span>
                )}
              </div>
            </div>
            {(j as any).employerPhone && (
              <a
                href={`tel:${(j as any).employerPhone}`}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-brand-primary hover:text-white text-slate-500 flex items-center justify-center shrink-0 transition-all shadow-2xs hover:shadow-brand-primary/20 cursor-pointer"
                title="Qo'ng'iroq qilish"
              >
                <Phone size={14} />
              </a>
            )}
          </div>

          {/* Hired Worker Card */}
          {detail?.hiredWorker ? (
            <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                  <UserCheck size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">{adminText().assignedWorker}</span>
                  <span className="text-xs font-black text-slate-900 block truncate mt-0.5">{detail.hiredWorker.workerName}</span>
                  {detail.hiredWorker.workerPhone && (
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block truncate">{detail.hiredWorker.workerPhone}</span>
                  )}
                </div>
              </div>
              {detail.hiredWorker.workerPhone && (
                <a
                  href={`tel:${detail.hiredWorker.workerPhone}`}
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-500 flex items-center justify-center shrink-0 transition-all shadow-2xs hover:shadow-emerald-600/20 cursor-pointer"
                  title="Qo'ng'iroq qilish"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-dashed border-slate-200 flex items-center gap-3 text-slate-400">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{adminText().assignedWorker}</span>
                <span className="text-xs font-bold text-slate-500 mt-0.5 block">Hozircha biriktirilmagan</span>
              </div>
            </div>
          )}
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Joylashuv va Manzil</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 truncate block mt-0.5">{j.rawLocation || j.location || '—'}</span>
          </div>
        </div>

        {/* Description */}
        {j.description && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-2">
              <FileText size={15} className="text-brand-primary" />
              <span>{adminText().extraInfo}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">{j.description}</p>
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3.5 flex items-center gap-2">
              <Briefcase size={15} className="text-brand-primary" />
              <span>Ish vazifalari ({tasks.length})</span>
            </h3>
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-6 h-6 rounded-xl bg-brand-primary text-white shadow-xs shadow-brand-primary/20 flex items-center justify-center text-[11px] font-mono font-black shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">{task.replace(/^-/, '').trim()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        {requirements.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3.5 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Nomzodga qo'yiladigan talablar ({requirements.length})</span>
            </h3>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/60">
                  <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{req.replace(/^-/, '').trim()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {j.tags && Array.isArray(j.tags) && j.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {j.tags.map((tag: string, i: number) => (
              <span key={i} className="bg-white text-slate-700 px-3 py-1 rounded-xl text-[11px] font-bold border border-slate-200/80 shadow-2xs hover:border-brand-primary/40 transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; bg: string; label: string; value: string; color?: string }> = ({ 
  icon, 
  bg, 
  label, 
  value,
  color = "text-slate-900"
}) => (
  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center shrink-0 border border-slate-100`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</span>
    </div>
    <p className={`text-xs sm:text-sm font-black truncate font-mono ${color}`}>{value}</p>
  </div>
);

/* ========================= TIMELINE TAB ========================= */
const timelineIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  'plus': { icon: <Plus size={14} />, color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' },
  'user': { icon: <User size={14} />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
  'check': { icon: <UserCheck size={14} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  'dollar': { icon: <Banknote size={14} />, color: 'bg-amber-100 text-amber-600 border-amber-200' },
  'credit-card': { icon: <CreditCard size={14} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  'file': { icon: <FileText size={14} />, color: 'bg-violet-100 text-violet-600 border-violet-200' },
};

const TimelineTab: React.FC<{ timeline: AdminTimelineEvent[] }> = ({ timeline }) => (
  <div className="p-5 sm:p-6 max-w-xl mx-auto">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <History size={14} />
        </div>
        <span>Voqealar Xronologiyasi</span>
      </h3>
      {timeline.length > 0 && (
        <span className="text-[11px] font-black text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
          {timeline.length} ta yozuv
        </span>
      )}
    </div>

    {timeline.length === 0 ? (
      <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <History size={22} />
        </div>
        <p className="text-xs font-bold text-slate-700">{adminText().noEventsYet}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Ushbu e'lon bo'yicha hech qanday voqea qayd etilmagan</p>
      </div>
    ) : (
      <div className="relative pl-2">
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200" />
        
        <div className="space-y-3.5">
          {timeline.map((event, idx) => {
            const ic = timelineIcons[event.icon] || timelineIcons['plus'];
            return (
              <div key={idx} className="flex items-start gap-3.5 relative">
                <div className={`w-9 h-9 rounded-2xl ${ic.color} flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-2xs`}>
                  {ic.icon}
                </div>
                <div className="flex-1 min-w-0 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
                  <p className="text-xs font-black text-slate-900 leading-snug">{event.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 font-mono">{formatDate(event.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

/* ========================= APPLICATIONS TAB ========================= */
const ApplicationsTab: React.FC<{ applications: AdminJobApplication[] }> = ({ applications }) => (
  <div className="p-5 sm:p-6 max-w-2xl mx-auto">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <Users size={14} />
        </div>
        <span>Kelib Tushgan Arizalar</span>
      </h3>
      <span className="text-[11px] font-black text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
        {applications.length} ta nomzod
      </span>
    </div>

    {applications.length === 0 ? (
      <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Users size={22} />
        </div>
        <p className="text-xs font-bold text-slate-700">{adminText().noApplicationsYet}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Hali hech kim ariza topshirmagan</p>
      </div>
    ) : (
      <div className="space-y-3.5">
        {applications.map(app => {
          const st = appStatusLabels[app.status] || { label: app.status, color: 'text-slate-600 bg-slate-50 border-slate-200' };
          return (
            <div key={app.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/80 shadow-2xs">
                    {app.workerAvatar ? (
                      <img
                        src={app.workerAvatar}
                        alt={app.workerName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.workerName || 'W') + '&background=F1F5F9&color=64748B&size=100';
                          if (target.src !== fallback) target.src = fallback;
                        }}
                      />
                    ) : (
                      <User size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{app.workerName}</p>
                    {app.workerPhone && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{app.workerPhone}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${st.color}`}>
                  {st.label}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium pt-3 border-t border-slate-100 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" /> {formatDate(app.appliedDate)}
                </span>
                {app.rating !== undefined && (
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <Star size={13} className="text-amber-500 fill-amber-500" /> {app.rating}/5
                  </span>
                )}
                {app.bonus && app.bonus > 0 ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                    <DollarSign size={13} /> Bonus: {app.bonus}
                  </span>
                ) : null}
              </div>

              {app.review && (
                <p className="mt-3 text-xs text-slate-700 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-100 font-medium italic">
                  "{app.review}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

/* ========================= PAYMENTS TAB ========================= */
const PaymentsTab: React.FC<{ transactions: AdminJobTransaction[] }> = ({ transactions }) => {
  const language = adminLang();

  return (
    <div className="p-5 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <CreditCard size={14} />
          </div>
          <span>Moliyaviy To'lovlar</span>
        </h3>
        <span className="text-[11px] font-black text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
          {transactions.length} ta operatsiya
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={22} />
          </div>
          <p className="text-xs font-bold text-slate-700">{adminText().noPaymentsFound}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ushbu e'lon bo'yicha tranzaksiyalar mavjud emas</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {transactions.map(tx => {
            const st = txnStatusLabels[tx.status] || { label: tx.status, color: 'text-slate-600 bg-slate-50 border-slate-200' };
            return (
              <div key={tx.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 shadow-2xs">
                      {tx.type === 'deposit' ? <Banknote size={17} /> : <CreditCard size={17} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">{txnTypeLabels[tx.type] || tx.type}</p>
                      <p className="text-[10px] text-slate-400 font-medium font-mono">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                
                <div className="bg-slate-50/90 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider">Summa</span>
                    <span className="text-emerald-700 font-black font-mono text-sm">{money(tx.amount, language)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider">Platforma komissiyasi</span>
                    <span className="text-slate-900 font-black font-mono text-sm">{money(tx.platformFee, language)}</span>
                  </div>
                  {tx.employerName && (
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider">{adminText().roleEmployer}</span>
                      <span className="text-slate-800 font-bold truncate block">{tx.employerName}</span>
                    </div>
                  )}
                  {tx.workerName && (
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider">{adminText().roleWorker}</span>
                      <span className="text-slate-800 font-bold truncate block">{tx.workerName}</span>
                    </div>
                  )}
                </div>

                {tx.providerTransactionId && (
                  <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1.5 font-mono bg-slate-100 px-3 py-1.5 rounded-xl">
                    <FileText size={11} className="text-slate-500" /> 
                    <span>Tranzaksiya ID:</span>
                    <span className="text-slate-700 font-bold">{tx.providerTransactionId}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
