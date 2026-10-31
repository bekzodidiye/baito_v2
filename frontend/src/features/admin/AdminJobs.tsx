import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminJob } from './types';
import {
  Search, Trash2, MapPin, Building2, DollarSign, XCircle, Briefcase,
  CheckCircle, Clock, AlertTriangle, LayoutGrid, Table, Eye, X, ChevronDown,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { RejectJobModal } from './RejectJobModal';
import { AdminJobsAutoDeleteBanner } from './AdminJobsAutoDeleteBanner';
import { JobDetailModal } from './JobDetailModal';

interface AdminJobsProps {
  jobs: AdminJob[];
  onChangeJobStatus: (jobId: string, status: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export const AdminJobs: React.FC<AdminJobsProps> = ({ jobs, onChangeJobStatus, onDeleteJob }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [rejectingJob, setRejectingJob] = useState<AdminJob | null>(null);
  const [openJob, setOpenJob] = useState<AdminJob | null>(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countOpen = jobs.filter(j => j.status === 'open').length;
  const countInProgress = jobs.filter(j => j.status === 'in_progress').length;
  const countCompleted = jobs.filter(j => j.status === 'completed').length;
  const countCancelled = jobs.filter(j => j.status === 'cancelled').length;
  const countDispute = jobs.filter(j => j.status === 'dispute').length;

  const handleConfirmReject = (reason: string, comment: string) => {
    if (rejectingJob) {
      onChangeJobStatus(rejectingJob.id, 'cancelled');
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{a.totalPostings}</span>
            <Briefcase size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{jobs.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ochiq e'lonlar</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">{countOpen}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jarayonda</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{countInProgress}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bajarilgan</span>
            <CheckCircle size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-600">{countCompleted}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rad / Nizo</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600">{countCancelled + countDispute}</div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Search input with clear */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={a.searchJobsPlaceholder}
            type="text"
            placeholder={a.searchJobsPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 overflow-x-auto no-scrollbar">
          {/* Status filter pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: 'all', label: a.statusAll || 'Barchasi' },
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
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Karta ko'rinishi"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Briefcase size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700">E'lonlar topilmadi</p>
              <p className="text-xs text-slate-400 mt-1">Qidiruv parametrlarini o'zgartirib ko'ring</p>
            </div>
          ) : (
            filteredJobs.map((j) => (
              <div
                key={j.id}
                role="button"
                tabIndex={0}
                aria-label={`${j.title} — batafsil`}
                onClick={() => setOpenJob(j)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenJob(j);
                  }
                }}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all shadow-xs flex flex-col justify-between gap-4 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Status Pill Dropdown */}
                    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={j.status}
                        onChange={(e) => onChangeJobStatus(j.id, e.target.value)}
                        className={`px-3 py-1 pr-7 rounded-xl text-[11px] font-black uppercase tracking-wider border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                          j.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : j.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : j.status === 'dispute'
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : j.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="open">{a.chipOpen || 'Ochiq'}</option>
                        <option value="in_progress">{a.chipInProgress || 'Jarayonda'}</option>
                        <option value="completed">{a.chipDone || 'Bajarilgan'}</option>
                        <option value="dispute">{a.chipDispute || 'Nizo'}</option>
                        <option value="cancelled">{a.cancelledOrRejected || 'Bekor/Rad'}</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                    </div>

                    {/* Quick moderation icons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRejectingJob(j)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                        title={a.rejectWithReason}
                      >
                        <XCircle size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const isRunning = j.status === 'in_progress';
                          const confirmMsg = isRunning
                            ? `⚠️ DIQQAT! Bu e'lon jarayonda — ishchi ishlayapti.\n\n"${j.title}" e'lonini baribir tizimdan o'chirasizmi?`
                            : `"${j.title}" e'lonini tizimdan to'liq o'chirib tashlaysizmi?`;
                          if (confirm(confirmMsg)) {
                            onDeleteJob(j.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
                        title={a.deletePosting}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Company */}
                  <h3 className="font-black text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {j.title}
                  </h3>

                  <div className="space-y-1.5 mt-3 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{j.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{j.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 font-black font-mono pt-1">
                      <DollarSign size={14} className="shrink-0" />
                      <span>{(parseFloat(j.salary || '0')).toLocaleString('uz-UZ')} UZS</span>
                      {j.durationLabel && (
                        <span className="text-slate-400 font-semibold font-sans text-[11px]">({j.durationLabel})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>ID: {j.id.slice(0, 8)}...</span>
                  <span className="font-semibold text-slate-500 font-sans flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                    <span>Batafsil</span>
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Dense Table View */
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
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
                      <td className="p-4 pl-5 font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer" onClick={() => setOpenJob(j)}>
                        <div>{j.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {j.id.slice(0, 8)}...</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{j.company}</td>
                      <td className="p-4 text-slate-500">{j.location}</td>
                      <td className="p-4 font-black font-mono text-emerald-600">
                        {(parseFloat(j.salary || '0')).toLocaleString('uz-UZ')} UZS
                      </td>
                      <td className="p-4">
                        <select
                          value={j.status}
                          onChange={(e) => onChangeJobStatus(j.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-50 border-slate-200 cursor-pointer"
                        >
                          <option value="open">Ochiq</option>
                          <option value="in_progress">Jarayonda</option>
                          <option value="completed">Bajarilgan</option>
                          <option value="dispute">Nizo</option>
                          <option value="cancelled">Bekor</option>
                        </select>
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setOpenJob(j)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                            title="Batafsil ko'rish"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setRejectingJob(j)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl cursor-pointer"
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
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
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
