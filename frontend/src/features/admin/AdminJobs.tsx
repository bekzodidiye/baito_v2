import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminJob } from './types';
import { money } from '../../utils/money';
import { getJobBannerImage } from '../employer/EmployerJobCard';
import {
  Search, Trash2, Building2, XCircle, Briefcase,
  CheckCircle, Clock, AlertTriangle, LayoutGrid, Table, Eye,
  Copy, Check, X
} from 'lucide-react';
import { RejectJobModal } from './RejectJobModal';
import { AdminJobsAutoDeleteBanner } from './AdminJobsAutoDeleteBanner';
import { JobDetailModal } from './JobDetailModal';
import { StatusSelect } from './AdminCustomControls';
import { clickable } from '../../utils/clickable';

const getCompanyBrand = (name: string = '') => {
  const clean = name.trim() || 'B';
  const initial = clean.charAt(0).toUpperCase();
  const colors = [
    { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', text: 'text-white' },
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return { initial, color };
};

const CompanyAvatar: React.FC<{ url?: string; name: string; title: string; size?: 'sm' | 'md' }> = ({
  url,
  name,
  title,
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);
  const brand = getCompanyBrand(name || title);
  const sizeClass = size === 'sm' ? 'w-9 h-9 rounded-xl text-xs' : 'w-12 h-12 rounded-2xl text-lg';

  if (url && !hasError) {
    return (
      <div className={`relative ${sizeClass} overflow-hidden bg-slate-100 shrink-0 border border-slate-200/90 shadow-2xs group-hover:scale-105 transition-transform duration-300`}>
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClass} shrink-0 ${brand.color.bg} ${brand.color.text} flex items-center justify-center font-black shadow-2xs group-hover:scale-105 transition-transform duration-300 border border-white/20 select-none`}
    >
      <span>{brand.initial}</span>
    </div>
  );
};

interface AdminJobGridCardProps {
  job: AdminJob;
  language: 'uz' | 'ru' | 'en';
  a: Record<string, any>;
  copiedId: string | null;
  onCopyId: (e: React.MouseEvent, id: string) => void;
  onOpen: (job: AdminJob) => void;
  onDelete: (jobId: string, title: string, isRunning: boolean) => void;
  onApprove?: (jobId: string) => void;
  onRejectRequest: (job: AdminJob) => void;
  onChangeStatus: (jobId: string, status: string) => void;
}

const AdminJobGridCard: React.FC<AdminJobGridCardProps> = ({
  job: j,
  a,
  copiedId,
  onCopyId,
  onOpen,
  onDelete,
  onApprove,
  onRejectRequest,
  onChangeStatus,
}) => {
  const avatarUrl = j.logoUrl || j.imageUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${j.title} — batafsil`}
      onClick={() => onOpen(j)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(j);
        }
      }}
      className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 flex flex-col gap-3.5 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-brand-primary/20 relative p-4 sm:p-5 ${
        j.status === 'pending'
          ? 'border-amber-300/80 hover:border-amber-400 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-amber-500/5'
          : 'border-slate-200/90 hover:border-brand-primary/40 hover:shadow-brand-primary/5'
      }`}
    >
      {/* Pending glowing stripe */}
      {j.status === 'pending' && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 rounded-t-2xl sm:rounded-t-3xl" />
      )}

      <div className="space-y-3.5">
        {/* Top Header: Status (at the top) & Actions */}
        <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Status positioned at the top */}
            {j.status === 'pending' ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRejectRequest(j)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200/80 active:scale-95 cursor-pointer shadow-2xs"
                  title={a.rejectWithReason}
                >
                  <XCircle size={12} />
                  <span>Rad etish</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove ? onApprove(j.id) : onChangeStatus(j.id, 'open')}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs hover:shadow-emerald-600/20"
                  title={a.approveJob || "Tasdiqlash"}
                >
                  <CheckCircle size={12} />
                  <span>Tasdiqlash</span>
                </button>
              </div>
            ) : (
              <StatusSelect
                value={j.status}
                onChange={(val) => onChangeStatus(j.id, val)}
              />
            )}
          </div>

          {/* Top Right: Copy ID & Delete button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => onCopyId(e, j.id)}
              className="text-[10px] text-slate-400 hover:text-slate-700 font-mono flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="ID nusxalash"
            >
              {copiedId === j.id ? (
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <Check size={11} /> Nusxalandi
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <Copy size={11} /> #{j.id.slice(0, 6)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onDelete(j.id, j.title, j.status === 'in_progress')}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              title={a.deletePosting}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Job Identity Block: Avatar + Title + Company (no salary or extra boxes) */}
        <div className="flex items-start gap-3.5 pt-1">
          <CompanyAvatar
            url={avatarUrl}
            name={j.company || j.employerName || ''}
            title={j.title}
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 text-sm sm:text-[15px] leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
              {j.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-semibold truncate">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{j.company || j.employerName || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminJobsProps {
  jobs: AdminJob[];
  onChangeJobStatus: (jobId: string, status: string) => void;
  onDeleteJob: (jobId: string) => void;
  onApproveJob?: (jobId: string) => void;
  onRejectJob?: (jobId: string, reason?: string) => void;
}

export const AdminJobs: React.FC<AdminJobsProps> = ({
  jobs,
  onChangeJobStatus,
  onDeleteJob,
  onApproveJob,
  onRejectJob,
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [rejectingJob, setRejectingJob] = useState<AdminJob | null>(null);
  const [openJob, setOpenJob] = useState<AdminJob | null>(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase()) ||
      j.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countPending = jobs.filter(j => j.status === 'pending').length;
  const countOpen = jobs.filter(j => j.status === 'open').length;
  const countInProgress = jobs.filter(j => j.status === 'in_progress').length;
  const countCompleted = jobs.filter(j => j.status === 'completed').length;
  const countCancelled = jobs.filter(j => j.status === 'cancelled' || j.status === 'rejected').length;
  const countDispute = jobs.filter(j => j.status === 'dispute').length;

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleConfirmReject = (reason: string, comment: string) => {
    if (rejectingJob) {
      const fullReason = comment ? `${reason}: ${comment}` : reason;
      if (onRejectJob) {
        onRejectJob(rejectingJob.id, fullReason);
      } else {
        onChangeJobStatus(rejectingJob.id, 'rejected');
      }
      alert(`"${rejectingJob.title}" rad etildi. Sabab: ${reason}. Izoh: ${comment}`);
      setRejectingJob(null);
    }
  };

  const handleRunAutoCleanup = () => {
    const cancelledJobs = jobs.filter((j) => j.status === 'cancelled');
    if (cancelledJobs.length === 0) {
      alert("Hozirda avto-o'chirish uchun mos (bekor qilingan/eskirgan) e'lonlar topilmadi.");
      return;
    }
    if (confirm(`Barcha bekor qilingan (${cancelledJobs.length} ta) e'lonlarni tizimdan avtomatik o'chirib tashlaysizmi?`)) {
      cancelledJobs.forEach((j) => onDeleteJob(j.id));
      alert(`${cancelledJobs.length} ta e'lon avtomatik o'chirildi!`);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Auto-Delete Notification Banner */}
      <AdminJobsAutoDeleteBanner
        autoDeleteEnabled={autoDeleteEnabled}
        onToggleAutoDelete={() => setAutoDeleteEnabled(!autoDeleteEnabled)}
        onRunCleanup={handleRunAutoCleanup}
      />

      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{a.totalPostings}</span>
            <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Briefcase size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{jobs.length}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Barcha e'lonlar</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">Kutilmoqda</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{countPending}</div>
          <div className="text-[11px] text-amber-600/80 font-medium mt-0.5">Moderatsiyada</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Ochiq e'lonlar</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{countOpen}</div>
          <div className="text-[11px] text-emerald-600/80 font-medium mt-0.5">Ariza qabul qilmoqda</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Jarayonda</span>
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Briefcase size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-600 tracking-tight">{countInProgress}</div>
          <div className="text-[11px] text-sky-600/80 font-medium mt-0.5">Ish davom etmoqda</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Bajarilgan</span>
            <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-brand-primary tracking-tight">{countCompleted}</div>
          <div className="text-[11px] text-brand-primary/80 font-medium mt-0.5">Muvaffaqiyatli yakun</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Rad / Nizo</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">{countCancelled + countDispute}</div>
          <div className="text-[11px] text-rose-600/80 font-medium mt-0.5">Nazorat talab</div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
        {/* Search input with clear */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={a.searchJobsPlaceholder}
            type="text"
            placeholder={a.searchJobsPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 overflow-x-auto no-scrollbar">
          {/* Status filter pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: 'all', label: a.statusAll || 'Barchasi' },
              { id: 'pending', label: `${a.statusPending || 'Kutilmoqda'}${countPending > 0 ? ` (${countPending})` : ''}` },
              { id: 'open', label: a.chipOpen || 'Ochiq' },
              { id: 'in_progress', label: a.chipInProgress || 'Jarayonda' },
              { id: 'completed', label: a.chipDone || 'Bajarilgan' },
              { id: 'dispute', label: a.chipDispute || 'Nizo' },
              { id: 'cancelled', label: a.chipCancelledRejected || 'Bekor/Rad' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-brand-primary shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Karta ko'rinishi"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-brand-primary shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Jadval ko'rinishi"
            >
              <Table size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Table Representation */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Briefcase size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700">E'lonlar topilmadi</p>
              <p className="text-xs text-slate-400 mt-1">Qidiruv parametrlarini o'zgartirib ko'ring</p>
              {(search || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          ) : (
            filteredJobs.map((j) => (
              <AdminJobGridCard
                key={j.id}
                job={j}
                language={language}
                a={a}
                copiedId={copiedId}
                onCopyId={handleCopyId}
                onOpen={setOpenJob}
                onDelete={(jobId, title, isRunning) => {
                  const confirmMsg = isRunning
                    ? `⚠️ DIQQAT! Bu e'lon jarayonda — ishchi ishlayapti.\n\n"${title}" e'lonini baribir tizimdan o'chirasizmi?`
                    : `"${title}" e'lonini tizimdan to'liq o'chirib tashlaysizmi?`;
                  if (confirm(confirmMsg)) {
                    onDeleteJob(jobId);
                  }
                }}
                onApprove={onApproveJob}
                onRejectRequest={setRejectingJob}
                onChangeStatus={onChangeJobStatus}
              />
            ))
          )}
        </div>
      ) : (
        /* Dense Table View */
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-5">E'lon va Kasb</th>
                  <th className="p-4">Kompaniya</th>
                  <th className="p-4">Manzil</th>
                  <th className="p-4">Ish haqi</th>
                  <th className="p-4">Holat</th>
                  <th className="p-4 pr-5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      E'lonlar topilmadi
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="p-4 pl-5 font-bold text-slate-900 group-hover:text-brand-primary cursor-pointer" {...clickable(() => setOpenJob(j))}>
                        <div className="flex items-center gap-3">
                          <CompanyAvatar
                            size="sm"
                            url={j.logoUrl || j.imageUrl}
                            name={j.company || j.employerName || ''}
                            title={j.title}
                          />
                          <div className="min-w-0">
                            <div className="truncate max-w-xs">{j.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">#{j.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{j.company || j.employerName || '—'}</td>
                      <td className="p-4 text-slate-500 truncate max-w-[160px]">{j.rawLocation || j.location || '—'}</td>
                      <td className="p-4 font-black font-mono text-emerald-600 whitespace-nowrap">
                        {money(j.salary, language)}
                      </td>
                      <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {j.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => onApproveJob ? onApproveJob(j.id) : onChangeJobStatus(j.id, 'open')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title={a.approveJob || "Tasdiqlash"}
                            >
                              <CheckCircle size={12} />
                              <span>{a.approveJob || "Tasdiqlash"}</span>
                            </button>
                          )}
                          <StatusSelect
                            value={j.status}
                            onChange={(val) => onChangeJobStatus(j.id, val)}
                          />
                        </div>
                      </td>
                      <td className="p-4 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setOpenJob(j)}
                            className="p-1.5 text-slate-600 hover:text-brand-primary hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                            title="Batafsil ko'rish"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setRejectingJob(j)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl cursor-pointer transition-colors"
                            title={a.rejectWithReason}
                          >
                            <XCircle size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${j.title}" e'lonini o'chirasizmi?`)) {
                                onDeleteJob(j.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                            title={a.deletePosting}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Job Inspection & Rejection */}
      {openJob && <JobDetailModal job={openJob} onClose={() => setOpenJob(null)} />}

      {rejectingJob && (
        <RejectJobModal
          jobTitle={rejectingJob.title}
          onClose={() => setRejectingJob(null)}
          onConfirmReject={handleConfirmReject}
        />
      )}
    </div>
  );
};
