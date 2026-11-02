import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { parseWorkDates, toIsoDate } from '../../utils/workDates';
import { AdminJob, AdminUser } from './types';
import { money } from '../../utils/money';
import { Search, Trash2, Building2, Briefcase, XCircle, Eye, Wallet, X, Clock, Calendar, AlertCircle, MapPin, DollarSign, Sparkles } from 'lucide-react';
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
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [pendingWorkerJobId, setPendingWorkerJobId] = useState<string | null>(null);
  const [payoutJobId, setPayoutJobId] = useState<string | null>(null);

  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yy}-${mm}-${dd}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const isMatchDate = (j: AdminJob, dateStr: string) => {
    const workDates = parseWorkDates(j.workDate);
    if (workDates.length > 0) {
      return workDates.includes(dateStr);
    }
    let created = todayStr;
    if (j.createdAt) {
      const d = new Date(j.createdAt);
      if (!isNaN(d.getTime())) created = toIsoDate(d);
    }
    return created === dateStr;
  };

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    const matchDate = isMatchDate(j, selectedDate);

    return matchSearch && matchStatus && matchDate;
  });

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
          <div className="text-rose-600 text-[11px] mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>Kech qolyapti</span>
          </div>
        );
      }
    }

    if (job.status === 'in_progress') {
      if (jobDate > todayFormatted || (jobDate === todayFormatted && currentHour < startHour)) {
        return (
          <div className="text-emerald-600 text-[11px] mt-1 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Erta boshlagan</span>
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

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const dayJobs = jobs.filter(j => isMatchDate(j, selectedDate));
  const openCount = dayJobs.filter(j => j.status === 'open').length;
  const activeCount = dayJobs.filter(j => j.status === 'confirmed' || j.status === 'in_progress').length;
  const completedCount = dayJobs.filter(j => j.status === 'completed').length;

  return (
    <div className="space-y-5 pb-8">
      {/* Date-specific Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Kunlik E'lonlar</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Calendar size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{dayJobs.length} ta</div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{selectedDate} sanasi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Ochiq E'lonlar</span>
            <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-brand-primary tracking-tight">{openCount} ta</div>
          <div className="text-[11px] font-semibold text-brand-primary/80 mt-0.5">Ishchi qidirilmoqda</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Jarayonda / Band</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{activeCount} ta</div>
          <div className="text-[11px] font-semibold text-amber-600/80 mt-0.5">Ishchi biriktirilgan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Yakunlangan</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{completedCount} ta</div>
          <div className="text-[11px] font-semibold text-emerald-600/80 mt-0.5">To'lovga tayyor</div>
        </div>
      </div>

      {/* Date Navigator, Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <CustomDatePicker 
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
          />

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setQuickDate(-1)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Kecha
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                selectedDate === todayStr ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20' : 'hover:bg-white text-slate-600'
              }`}
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Ertaga
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label={a.searchShort}
              type="text"
              placeholder={a.searchShort}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                  ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Job Cards List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700">{a.noJobsForThisDate}</p>
            <p className="text-xs text-slate-400 mt-1">Boshqa sanani tanlab ko'ring</p>
          </div>
        ) : (
          filteredJobs.map((j) => {
            const salaryFormatted = money(j.salary, language);
            const vacancies = Number(j.vacancies || (j.neededWorkers ? parseInt(j.neededWorkers) : 1));
            const hired = Number(j.hiredCount || (j.workerId ? 1 : 0));

            return (
              <div
                key={j.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-brand-primary/40 p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
              >
                {/* Top Quick Meta Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category */}
                    <span className="inline-flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-[11px] font-black border border-brand-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      <span>{j.category || a.jobTypeFallback || 'Kunlik ish'}</span>
                    </span>

                    {/* Salary Highlight */}
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-mono font-black border border-emerald-200/70 shadow-2xs">
                      <DollarSign size={13} className="text-emerald-600" />
                      <span>{salaryFormatted}</span>
                      {j.durationLabel && <span className="text-[10px] text-emerald-600 font-sans uppercase">({j.durationLabel})</span>}
                    </span>

                    {/* Fulfillment pill */}
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-slate-200/70" title="Ishchilar taqsimoti">
                      <span className="text-slate-400 font-normal">Kvota:</span>
                      <span>{hired}/{vacancies}</span>
                    </span>

                    {j.urgent && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-black border border-rose-200/60 animate-pulse">
                        <Sparkles size={11} />
                        Zudlik
                      </span>
                    )}
                  </div>

                  {/* Right Status Pill & Fast Actions */}
                  <div className="flex items-center gap-2">
                    <StatusSelect
                      value={j.status}
                      onChange={(val) => onChangeJobStatus(j.id, val)}
                    />

                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
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
                        <Wallet size={16} />
                      </button>
                      <button
                        onClick={() => setRejectingJob(j)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                        title={a.rejectWithReason}
                      >
                        <XCircle size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${j.title}" e'lonini to'liq o'chirib tashlaysizmi?`)) {
                            onDeleteJob(j.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                        title={a.deleteLabel}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4-Column Bento Content Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Column 1: Job Info */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">{a.jobNameLabel}</span>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedJobDetails(j)}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-2xs mt-0.5">
                        <Briefcase size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-slate-900 group-hover:text-brand-primary transition-colors leading-snug line-clamp-2">
                          {j.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{j.rawLocation || j.location || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Employer */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">{a.companyColumn}</span>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => handleUserClick(j.employerId)} 
                      className="flex items-center gap-3 cursor-pointer group bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs group-hover:text-brand-primary transition-colors">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-slate-800 group-hover:text-brand-primary truncate">{j.company || j.employerName || '—'}</p>
                        <span className="text-[10px] text-slate-400 font-mono block">ID: #{j.employerId.slice(0, 6)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Worker Assignment */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">{a.roleWorker}</span>
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
                        />
                      </div>
                      {j.workerId && (
                        <button
                          onClick={() => handleUserClick(j.workerId)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shrink-0 cursor-pointer border border-slate-200/80"
                          title={a.viewWorkerDetails}
                        >
                          <Eye size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Column 4: Timing & Schedule */}
                  <div className="min-w-0 bg-slate-50/80 p-2.5 px-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <span>{a.timeColumn}</span>
                      <Clock size={11} />
                    </div>
                    <span className="font-black text-xs text-slate-900 font-mono">{j.workTime || '09:00 - 18:00'}</span>
                    <ActualTiming job={j} />
                    {renderTimeWarning(j)}
                  </div>
                </div>
              </div>
            );
          })
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
const ActualTiming: React.FC<{ job: AdminJob }> = ({ job }) => {
  const t = workTimingOf(job);

  if (!t.startedAt && !t.finishedAt) {
    if (job.status !== 'in_progress' && job.status !== 'completed') return null;
    return (
      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
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
        <span className={late ? 'text-rose-600' : 'text-emerald-600'}>
          {t.startedAt ?? '—'}
        </span>
        <span className="text-slate-300">→</span>
        <span className={ranOver ? 'text-amber-600' : 'text-slate-700'}>
          {t.finishedAt ?? '—'}
        </span>
        {t.workedMin !== null && (
          <span className="text-slate-400 font-medium text-[10px]">({humanMinutes(t.workedMin)})</span>
        )}
      </div>

      {(late || early) && (
        <span className={`text-[10px] font-bold ${late ? 'text-rose-600' : 'text-emerald-600'}`}>
          {late
            ? `${humanMinutes(t.startDelayMin as number)} kech boshladi`
            : `${humanMinutes(t.startDelayMin as number)} erta boshladi`}
        </span>
      )}

      {(ranOver || leftEarly) && (
        <span className={`text-[10px] font-bold ${ranOver ? 'text-amber-600' : 'text-slate-500'}`}>
          {ranOver
            ? `${humanMinutes(t.finishDelayMin as number)} kech tugatdi`
            : `${humanMinutes(t.finishDelayMin as number)} erta tugatdi`}
        </span>
      )}
    </div>
  );
};
