import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
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
  Phone,
  FileText,
  CreditCard,
  History,
  Star,
  AlertCircle,
  Eye,
  Loader2,
  ChevronRight,
  Plus,
  UserCheck,
  Banknote,
} from 'lucide-react';
import { AdminJob, AdminJobDetailResponse, AdminJobApplication, AdminJobTransaction, AdminTimelineEvent } from './types';
import { useApp } from '../../context/AppContext';

interface JobDetailModalProps {
  job: AdminJob | null;
  onClose: () => void;
}

const API = import.meta.env.VITE_API_URL || '';

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

const statusLabels: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open: { label: 'Ariza ochiq', bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' },
  confirmed: { label: 'Ishchi olindi', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { label: 'Ish boshlandi', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Ish tugatildi', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Ish bekor qilindi', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  dispute: { label: 'Nizo', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const appStatusLabels: Record<string, { label: string; color: string }> = {
  applied: { label: 'Ariza yubordi', color: 'text-blue-600 bg-blue-50' },
  hired: { label: 'Qabul qilindi', color: 'text-emerald-600 bg-emerald-50' },
  completed: { label: 'Yakunlandi', color: 'text-slate-600 bg-slate-100' },
  rejected: { label: 'Rad etildi', color: 'text-red-600 bg-red-50' },
};

const txnTypeLabels: Record<string, string> = {
  deposit: 'Depozit',
  payment: "To'lov",
  withdraw: 'Yechib olish',
};

const txnStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Kutilmoqda', color: 'text-amber-600 bg-amber-50' },
  paid: { label: "To'langan", color: 'text-emerald-600 bg-emerald-50' },
  canceled: { label: 'Bekor qilingan', color: 'text-red-600 bg-red-50' },
};

type TabKey = 'info' | 'timeline' | 'applications' | 'payments';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info', label: "Ma'lumot", icon: <FileText size={16} /> },
  { key: 'timeline', label: 'Tarix', icon: <History size={16} /> },
  { key: 'applications', label: 'Arizalar', icon: <Users size={16} /> },
  { key: 'payments', label: "To'lovlar", icon: <CreditCard size={16} /> },
];

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose }) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('baito_token') || '';
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [detail, setDetail] = useState<AdminJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job) return;
    setLoading(true);
    fetch(`${API}/api/v1/admin/jobs/${job.id}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [job?.id, token]);

  if (!job) return null;

  const j = detail?.job || job;
  const status = statusLabels[j.status] || statusLabels.open;
  const tasks = j.responsibilities ? j.responsibilities.split('\n').filter(Boolean) : [];
  const requirements = j.requirements ? j.requirements.split('\n').filter(Boolean) : [];
  const bannerUrl = j.imageUrl || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-slate-800 hover:text-brand-primary transition-colors cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 -ml-1">
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight truncate max-w-[200px]">{j.title}</h2>
                <span className="text-[11px] text-slate-400 font-medium">#{j.id}</span>
              </div>
            </div>
            <div className={`${status.bg} ${status.text} px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-white shrink-0 px-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold transition-all cursor-pointer border-b-2 ${
                  activeTab === tab.key
                    ? 'text-brand-primary border-brand-primary'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-brand-primary" />
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
          <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0">
            <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[14px] transition-colors cursor-pointer active:scale-[0.98]">
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

const InfoTab: React.FC<InfoTabProps> = ({ j, tasks, requirements, bannerUrl, detail }) => (
  <div className="pb-6">
    {/* Banner */}
    <div className="w-full h-[160px] relative bg-slate-200">
      <img src={bannerUrl} alt={j.title} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
      {j.views !== undefined && (
        <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
          <Eye size={12} /> {j.views}
        </div>
      )}
    </div>

    <div className="px-4 -mt-6 relative z-10">
      {/* Title card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {j.category || 'Ish turi'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400 font-semibold text-[11px] truncate flex items-center gap-1">
            <Building2 size={11} /> {j.employerName || j.company}
          </span>
        </div>
        <h1 className="text-[18px] font-extrabold text-slate-900 leading-snug mb-2">{j.title}</h1>
        <div className="flex flex-wrap gap-1.5">
          {j.durationLabel && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-semibold">{j.durationLabel}</span>}
          {j.urgent && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-100">Zudlik</span>}
          {j.tags?.map((tag: string, i: number) => (
            <span key={i} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-semibold">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Employer & Worker Info */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        {/* Employer */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-blue-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-medium text-slate-400 block">Ish beruvchi</span>
            <span className="text-[13px] font-bold text-slate-800 block truncate">{j.employerName || '—'}</span>
          </div>
          {(j as any).employerPhone && (
            <span className="text-[11px] text-slate-400 font-medium">{(j as any).employerPhone}</span>
          )}
        </div>

        {/* Hired Worker */}
        {detail?.hiredWorker && (
          <div className="bg-white rounded-xl p-3 border border-slate-200/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <UserCheck size={16} className="text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-medium text-slate-400 block">Biriktirilgan ishchi</span>
              <span className="text-[13px] font-bold text-slate-800 block truncate">{detail.hiredWorker.workerName}</span>
            </div>
            {detail.hiredWorker.workerPhone && (
              <span className="text-[11px] text-slate-400 font-medium">{detail.hiredWorker.workerPhone}</span>
            )}
          </div>
        )}
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/60 flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-orange-500" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-medium text-slate-400 block">Joylashuv</span>
          <span className="text-[13px] font-bold text-slate-800 truncate block">{j.rawLocation || j.location || '—'}</span>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard icon={<DollarSign size={14} />} label="Maosh" value={j.salary || '—'} />
        <StatCard icon={<Zap size={14} />} label="Soatlik" value={j.hourlyRate || "Yo'q"} />
        <StatCard icon={<Calendar size={14} />} label="Sana" value={j.workDate || '—'} />
        <StatCard icon={<Timer size={14} />} label="Vaqt" value={j.workTime || '—'} />
      </div>

      {/* Description */}
      {j.description && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/60 mb-4">
          <h3 className="text-[13px] font-bold text-slate-800 mb-1.5">Qo'shimcha ma'lumot</h3>
          <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{j.description}</p>
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[13px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Briefcase size={14} className="text-brand-primary" /> Ish vazifalari
          </h3>
          <div className="space-y-1.5">
            {tasks.map((task, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/60">
                <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </div>
                <p className="text-[12px] text-slate-700 font-medium leading-snug">{task.replace(/^-/, '').trim()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Talablar
          </h3>
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/60">
            <ul className="space-y-2">
              {requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-[6px] shrink-0" />
                  <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{req.replace(/^-/, '').trim()}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
    <div className="flex items-center gap-1.5 mb-0.5 text-slate-400">
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
    <p className="text-[13px] font-bold text-slate-800 truncate">{value}</p>
  </div>
);


/* ========================= TIMELINE TAB ========================= */
const timelineIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  'plus': { icon: <Plus size={14} />, color: 'bg-blue-100 text-blue-600' },
  'user': { icon: <User size={14} />, color: 'bg-indigo-100 text-indigo-600' },
  'check': { icon: <UserCheck size={14} />, color: 'bg-emerald-100 text-emerald-600' },
  'dollar': { icon: <Banknote size={14} />, color: 'bg-amber-100 text-amber-600' },
  'credit-card': { icon: <CreditCard size={14} />, color: 'bg-green-100 text-green-600' },
};

const TimelineTab: React.FC<{ timeline: AdminTimelineEvent[] }> = ({ timeline }) => (
  <div className="px-5 py-5">
    <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
      <History size={16} className="text-brand-primary" /> Voqealar tarixi
    </h3>
    {timeline.length === 0 ? (
      <div className="text-center py-12 text-slate-400">
        <History size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-[13px] font-medium">Hozircha voqealar yo'q</p>
      </div>
    ) : (
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" />
        
        <div className="space-y-4">
          {timeline.map((event, idx) => {
            const ic = timelineIcons[event.icon] || timelineIcons['plus'];
            return (
              <div key={idx} className="flex items-start gap-3 relative">
                <div className={`w-8 h-8 rounded-full ${ic.color} flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm`}>
                  {ic.icon}
                </div>
                <div className="flex-1 min-w-0 bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
                  <p className="text-[13px] font-semibold text-slate-800">{event.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{formatDate(event.date)}</p>
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
  <div className="px-5 py-5">
    <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Users size={16} className="text-brand-primary" /> Arizalar ({applications.length})
    </h3>
    {applications.length === 0 ? (
      <div className="text-center py-12 text-slate-400">
        <Users size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-[13px] font-medium">Hozircha arizalar yo'q</p>
      </div>
    ) : (
      <div className="space-y-2.5">
        {applications.map(app => {
          const st = appStatusLabels[app.status] || { label: app.status, color: 'text-slate-600 bg-slate-50' };
          return (
            <div key={app.id} className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {app.workerAvatar ? (
                      <img src={app.workerAvatar} className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{app.workerName}</p>
                    {app.workerPhone && <p className="text-[11px] text-slate-400">{app.workerPhone}</p>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color}`}>{st.label}</span>
              </div>
              
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(app.appliedDate)}
                </span>
                {app.rating && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400" /> {app.rating}/5
                  </span>
                )}
                {app.bonus && app.bonus > 0 && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <DollarSign size={12} /> Bonus: {app.bonus}
                  </span>
                )}
              </div>
              {app.review && (
                <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg font-medium italic">"{app.review}"</p>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);


/* ========================= PAYMENTS TAB ========================= */
const PaymentsTab: React.FC<{ transactions: AdminJobTransaction[] }> = ({ transactions }) => (
  <div className="px-5 py-5">
    <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
      <CreditCard size={16} className="text-brand-primary" /> To'lov ma'lumotlari ({transactions.length})
    </h3>
    {transactions.length === 0 ? (
      <div className="text-center py-12 text-slate-400">
        <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-[13px] font-medium">To'lovlar topilmadi</p>
      </div>
    ) : (
      <div className="space-y-2.5">
        {transactions.map(tx => {
          const st = txnStatusLabels[tx.status] || { label: tx.status, color: 'text-slate-600 bg-slate-50' };
          return (
            <div key={tx.id} className="bg-white rounded-xl p-3.5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                    {tx.type === 'deposit' ? <Banknote size={16} className="text-brand-primary" /> : <CreditCard size={16} className="text-brand-primary" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{txnTypeLabels[tx.type] || tx.type}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color}`}>{st.label}</span>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 font-medium block">Summa</span>
                  <span className="text-slate-800 font-bold">{Number(tx.amount).toLocaleString()} so'm</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Platforma haqqi</span>
                  <span className="text-slate-800 font-bold">{Number(tx.platformFee).toLocaleString()} so'm</span>
                </div>
                {tx.employerName && (
                  <div>
                    <span className="text-slate-400 font-medium block">Ish beruvchi</span>
                    <span className="text-slate-800 font-bold">{tx.employerName}</span>
                  </div>
                )}
                {tx.workerName && (
                  <div>
                    <span className="text-slate-400 font-medium block">Ishchi</span>
                    <span className="text-slate-800 font-bold">{tx.workerName}</span>
                  </div>
                )}
              </div>

              {tx.providerTransactionId && (
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <FileText size={10} /> Tranzaksiya ID: {tx.providerTransactionId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);
