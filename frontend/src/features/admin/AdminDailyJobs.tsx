import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { parseWorkDates, toIsoDate } from '../../utils/workDates';
import { AdminJob, AdminUser } from './types';
import { Search, Trash2, MapPin, Building2, Briefcase, XCircle, Eye, Wallet } from 'lucide-react';
import { RejectJobModal } from './RejectJobModal';
import { UserDetailModal } from './UserDetailModal';
import { workTimingOf, humanMinutes, LATE_THRESHOLD_MIN } from './workTiming';
import { JobDetailModal } from './JobDetailModal';
import { PayoutModal } from './PayoutModal';
import { CustomSelect, CustomDatePicker, StatusSelect } from './AdminCustomControls';

interface AdminJobsProps {
  jobs: AdminJob[];
  users?: AdminUser[];
  onChangeJobStatus: (jobId: string, status: string) => void;
  onChangeJobWorker?: (jobId: string, workerId: string | null) => void;
  onDeleteJob: (jobId: string) => void;
  onAddBalance?: (userId: string, amount: number, reason: string) => void;
  onChangeRole?: (userId: string, role: string) => void;
  onToggleBan?: (userId: string, isBanned?: boolean) => void;
}

export const AdminDailyJobs: React.FC<AdminJobsProps> = ({ 
  jobs, 
  users = [],
  onChangeJobStatus,
  onChangeJobWorker,
  onDeleteJob,
  onAddBalance,
  onChangeRole,
  onToggleBan
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectingJob, setRejectingJob] = useState<AdminJob | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<AdminJob | null>(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [pendingWorkerJobId, setPendingWorkerJobId] = useState<string | null>(null);
  const [payoutJobId, setPayoutJobId] = useState<string | null>(null);

  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yy}-${mm}-${dd}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    
    // A job belongs to every day it is worked, not to the day it was posted.
    // This matched on createdAt, so a shift booked for 2, 3 and 4 September
    // appeared only under the day the employer happened to create it, and the
    // admin looking at the 3rd saw nothing.
    //
    // workDate is free text and often a list — "2026-09-02, 2026-09-03,
    // 2026-09-04" — so it is parsed rather than compared.
    const workDates = parseWorkDates(j.workDate);
    let matchDate: boolean;
    if (workDates.length > 0) {
      matchDate = workDates.includes(selectedDate);
    } else {
      // No work date recorded: fall back to the posting date, as before.
      let created = todayStr;
      if (j.createdAt) {
        const d = new Date(j.createdAt);
        if (!isNaN(d.getTime())) created = toIsoDate(d);
      }
      matchDate = created === selectedDate;
    }

    return matchSearch && matchStatus && matchDate;
  });

  const getMockTimeDetails = (job: AdminJob) => {
    // Determine start/end times based on job creation hash so it stays somewhat consistent
    const hash = job.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const startHour = 8 + (hash % 6); // between 08:00 and 13:00
    const duration = 4 + (hash % 6); // between 4 and 9 hours
    const endHour = startHour + duration;
    
    return {
      startHour,
      timeStr: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`
    };
  };

  const renderTimeWarning = (job: AdminJob) => {
    if (!job.workerId) return null;
    if (job.status === 'completed' || job.status === 'cancelled') return null;

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const tY = now.getFullYear();
    const tM = String(now.getMonth() + 1).padStart(2, '0');
    const tD = String(now.getDate()).padStart(2, '0');
    const todayFormatted = `${tY}-${tM}-${tD}`;
    
    let jobDate = todayFormatted;
    if (job.workDate) {
      jobDate = job.workDate;
    } else if (job.createdAt) {
      try {
        jobDate = job.createdAt.split('T')[0].split(' ')[0];
      } catch (e) {
        // ignore
      }
    }

    let startHour = 9; // Default 09:00
    if (job.workTime) {
      // e.g., "10:00 - 15:00"
      const parts = job.workTime.split('-');
      if (parts.length > 0) {
        const timePart = parts[0].trim();
        const [h, m] = timePart.split(':');
        if (h) startHour = parseInt(h, 10);
        if (m) startHour += parseInt(m, 10) / 60;
      }
    }


    if (job.status === 'open' || job.status === 'confirmed') {
      if (jobDate < todayFormatted || (jobDate === todayFormatted && currentHour > startHour)) {
        return (
          <div className="text-red-600 text-[11px] mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            Kech qolyapti
          </div>
        );
      }
    }

    if (job.status === 'in_progress') {
      if (jobDate > todayFormatted || (jobDate === todayFormatted && currentHour < startHour)) {
        return (
          <div className="text-emerald-600 text-[11px] mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Erta boshlagan
          </div>
        );
      }
    }
    return null;
  };

  const handleUserClick = (userId: string | undefined) => {
    if (!userId) return;
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
    }
  };

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <CustomDatePicker 
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
          />
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label={a.searchShort}
              type="text"
              placeholder={a.searchShort}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: a.statusAll },
            { id: 'open', label: a.statusOpen },
            { id: 'confirmed', label: a.statusHired },
            { id: 'in_progress', label: a.statusStarted },
            { id: 'completed', label: a.statusFinished },
            { id: 'cancelled', label: a.statusCancelledShort }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-sm">
            <p className="text-slate-400 font-semibold">{a.noJobsForThisDate}</p>
          </div>
        ) : (
          filteredJobs.map((j) => (
            <div key={j.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-4">
              
              {/* Job Info */}
              <div className="flex-1 min-w-0 w-40 shrink">
                <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">{a.jobNameLabel}</div>
                <div 
                  onClick={() => setSelectedJobDetails(j)}
                  className="font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Briefcase size={16} />
                  </div>
                  <span className="truncate">{j.title}</span>
                </div>
              </div>

              {/* Employer Info */}
              <div className="flex-1 min-w-0 w-40 shrink">
                <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">{a.companyColumn}</div>
                <div 
                  onClick={() => handleUserClick(j.employerId)} 
                  className="font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <span className="truncate">{j.employerName}</span>
                </div>
              </div>

              {/* Worker Assignment */}
              <div className="flex-1 min-w-0 shrink">
                <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">{a.roleWorker}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CustomSelect
                      value={j.workerId || ''}
                      onChange={(val) => {
                        if (val === '') {
                          onChangeJobWorker?.(j.id, null);
                        } else {
                          const selectedW = users.find(u => u.id === val);
                          if (selectedW) {
                            setSelectedUser(selectedW);
                            setPendingWorkerJobId(j.id);
                          }
                        }
                      }}
                      options={[
                        { value: '', label: a.unassigned },
                        ...users.filter(u => u.role === 'worker').map(w => ({
                          value: w.id,
                          label: w.name || 'Ismsiz ishchi'
                        }))
                      ]}
                      placeholder={a.pickAWorker}
                      className="bg-slate-50 hover:bg-slate-100"
                    />
                  </div>
                  {j.workerId && (
                    <button
                      onClick={() => handleUserClick(j.workerId)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                      title={a.viewWorkerDetails}
                    >
                      <Eye size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex-1 min-w-0 shrink">
                <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">{a.timeColumn}</div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">{j.workTime || '09:00 - 18:00'}</span>
                  <ActualTiming job={j} />
                  {renderTimeWarning(j)}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <StatusSelect
                  value={j.status}
                  onChange={(val) => onChangeJobStatus(j.id, val)}
                />

                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                  {/* Settling the shift by hand. Enabled only once the work is
                      finished — paying for a shift still in progress would
                      debit a balance the worker has not earned yet. Rendered
                      disabled rather than hidden so the action is discoverable
                      on the rows where it will eventually apply. */}
                  <button
                    onClick={() => setPayoutJobId(j.id)}
                    disabled={j.status !== 'completed'}
                    aria-label={a.confirmPayment}
                    className="p-2 rounded-xl transition-colors flex items-center justify-center text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    title={
                      j.status === 'completed'
                        ? a.confirmPayment
                        : a.onlyCompletedJobs
                    }
                  >
                    <Wallet size={18} />
                  </button>
                  <button
                    onClick={() => setRejectingJob(j)}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title={a.rejectWithReason}
                  >
                    <XCircle size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${j.title}" e'lonini to'liq o'chirib tashlaysizmi?`)) {
                        onDeleteJob(j.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title={a.deleteLabel}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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

      {selectedJobDetails && (
        <JobDetailModal
          job={selectedJobDetails}
          onClose={() => setSelectedJobDetails(null)}
        />
      )}

      {payoutJobId && (
        <PayoutModal
          jobId={payoutJobId}
          onClose={() => setPayoutJobId(null)}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null);
            setPendingWorkerJobId(null);
          }}
          onAddBalance={onAddBalance!}
          onChangeRole={onChangeRole!}
          onToggleBan={onToggleBan!}
          onConfirmAssignment={
            pendingWorkerJobId
              ? () => {
                  onChangeJobWorker?.(pendingWorkerJobId, selectedUser.id);
                  setSelectedUser(null);
                  setPendingWorkerJobId(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};


/* ===================== WHAT ACTUALLY HAPPENED ===================== */
/** The advertised shift sits above this; these are the real clock times.
 *
 *  Nothing is inferred. A job that ran before these were recorded shows
 *  "qayd etilmagan" rather than a guessed time — a made-up figure here would be
 *  read as a measurement, and this is the screen where lateness gets decided. */
const ActualTiming: React.FC<{ job: AdminJob }> = ({ job }) => {
  const t = workTimingOf(job);

  if (!t.startedAt && !t.finishedAt) {
    // Only worth saying on a job that should have times by now. An open
    // posting has not started, and that is not a gap in the record.
    if (job.status !== 'in_progress' && job.status !== 'completed') return null;
    return (
      <span className="text-[11px] text-slate-400 font-medium mt-1">
        Haqiqiy vaqt qayd etilmagan
      </span>
    );
  }

  const late = t.startDelayMin !== null && t.startDelayMin > LATE_THRESHOLD_MIN;
  const early = t.startDelayMin !== null && t.startDelayMin < -LATE_THRESHOLD_MIN;
  const ranOver = t.finishDelayMin !== null && t.finishDelayMin > LATE_THRESHOLD_MIN;
  const leftEarly = t.finishDelayMin !== null && t.finishDelayMin < -LATE_THRESHOLD_MIN;

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        <span className="text-slate-400">Haqiqiy:</span>
        <span className={late ? 'text-red-600' : 'text-emerald-600'}>
          {t.startedAt ?? '—'}
        </span>
        <span className="text-slate-300">→</span>
        <span className={ranOver ? 'text-amber-600' : 'text-slate-700'}>
          {t.finishedAt ?? '—'}
        </span>
        {t.workedMin !== null && (
          <span className="text-slate-400 font-medium">({humanMinutes(t.workedMin)})</span>
        )}
      </div>

      {(late || early) && (
        <span className={`text-[11px] font-bold ${late ? 'text-red-600' : 'text-emerald-600'}`}>
          {late
            ? `${humanMinutes(t.startDelayMin as number)} kech boshladi`
            : `${humanMinutes(t.startDelayMin as number)} erta boshladi`}
        </span>
      )}

      {(ranOver || leftEarly) && (
        <span className={`text-[11px] font-bold ${ranOver ? 'text-amber-600' : 'text-slate-500'}`}>
          {ranOver
            ? `${humanMinutes(t.finishDelayMin as number)} kech tugatdi`
            : `${humanMinutes(t.finishDelayMin as number)} erta tugatdi`}
        </span>
      )}
    </div>
  );
};
