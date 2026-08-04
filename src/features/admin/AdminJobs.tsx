import React, { useState } from 'react';
import { AdminJob } from './types';
import { Search, Trash2, MapPin, Building2, DollarSign, XCircle } from 'lucide-react';
import { RejectJobModal } from './RejectJobModal';
import { AdminJobsAutoDeleteBanner } from './AdminJobsAutoDeleteBanner';

interface AdminJobsProps {
  jobs: AdminJob[];
  onChangeJobStatus: (jobId: string, status: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export const AdminJobs: React.FC<AdminJobsProps> = ({ jobs, onChangeJobStatus, onDeleteJob }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectingJob, setRejectingJob] = useState<AdminJob | null>(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
    <div className="space-y-4">
      <AdminJobsAutoDeleteBanner
        autoDeleteEnabled={autoDeleteEnabled}
        onToggleAutoDelete={() => setAutoDeleteEnabled(!autoDeleteEnabled)}
        onRunCleanup={handleRunAutoCleanup}
      />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Sarlavha, kompaniya yoki manzil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'open', label: 'Ochiq' },
            { id: 'in_progress', label: 'Jarayonda' },
            { id: 'completed', label: 'Bajarilgan' },
            { id: 'dispute', label: 'Nizo' },
            { id: 'cancelled', label: 'Bekor/Rad' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold">
            E'lonlar topilmadi
          </div>
        ) : (
          filteredJobs.map((j) => (
            <div
              key={j.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <select
                      value={j.status}
                      onChange={(e) => onChangeJobStatus(j.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider mb-2 border cursor-pointer focus:outline-none ${
                        j.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : j.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : j.status === 'dispute'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <option value="open">Ochiq (Open)</option>
                      <option value="in_progress">Jarayonda (Active)</option>
                      <option value="completed">Bajarildi (Completed)</option>
                      <option value="dispute">Nizo (Dispute)</option>
                      <option value="cancelled">Bekor qilindi / Rad etildi</option>
                    </select>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">{j.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRejectingJob(j)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                      title="Rad etish (Sabab bilan)"
                    >
                      <XCircle size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const isEscrowActive = j.status === 'in_progress';
                        const confirmMsg = isEscrowActive
                          ? `⚠️ DIQQAT! Bu e'lon jarayonda! Escrow muzlatilgan pul bor.\n\n"${j.title}" e'lonini baribir tizimdan o'chirasizmi?`
                          : `"${j.title}" e'lonini tizimdan to'liq o'chirib tashlaysizmi?`;
                        if (confirm(confirmMsg)) {
                          onDeleteJob(j.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="E'lonni o'chirish"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{j.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{j.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <DollarSign size={14} className="shrink-0" />
                    <span>{(parseFloat(j.salary || '0')).toLocaleString('uz-UZ')} UZS</span>
                    {j.durationLabel && <span className="text-slate-400 font-normal">({j.durationLabel})</span>}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>ID: {j.id.slice(0, 8)}...</span>
                <span>Employer: {j.employerId ? j.employerId.slice(0, 8) : 'System'}</span>
              </div>
            </div>
          ))
        )}
      </div>

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

