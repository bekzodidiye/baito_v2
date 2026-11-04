import React, { useState, useRef, useEffect } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { parseWorkDates, toIsoDate } from '../../utils/workDates';
import { AdminJob, AdminUser } from './types';
import { money } from '../../utils/money';
import {
  Search,
  Trash2,
  Building2,
  Briefcase,
  XCircle,
  Eye,
  Wallet,
  X,
  Clock,
  Calendar,
  CalendarClock,
  MapPin,
  Sparkles,
  Coins,
  Users,
  UserPlus,
  UserX,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { RejectJobModal } from './RejectJobModal';
import { UserDetailModal } from './UserDetailModal';
import { workTimingOf, humanMinutes, LATE_THRESHOLD_MIN } from './workTiming';
import { JobDetailModal } from './JobDetailModal';
import { PayoutModal } from './PayoutModal';
import { CustomDatePicker, StatusSelect } from './AdminCustomControls';

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
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

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
  const workersList = users.filter(u => u.role === 'worker');

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
            const assignedWorker = j.workerId ? users.find(u => u.id === j.workerId) : null;
            const isAssigningThis = assigningJobId === j.id;

            return (
              <div
                key={j.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-brand-primary/40 p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
              >
                {/* Top Quick Meta Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category */}
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200/80">
                      <Briefcase size={12} className="text-brand-primary" />
                      <span>{j.category || 'Kunlik ish'}</span>
                    </span>

                    {/* Salary Highlight - clean currency without confusing dollar sign */}
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-200/80 shadow-2xs">
                      <Coins size={13} className="text-emerald-600 shrink-0" />
                      <span>{salaryFormatted}</span>
                      {j.durationLabel && (
                        <span className="text-[10px] text-emerald-600 font-sans uppercase font-medium">({j.durationLabel})</span>
                      )}
                    </span>

                    {/* Quota status */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      hired >= vacancies
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : hired > 0
                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                        : 'bg-slate-100 text-slate-600 border-slate-200/80'
                    }`}>
                      <Users size={12} className="shrink-0" />
                      <span>Kvota: {hired}/{vacancies}</span>
                    </span>

                    {j.urgent && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200/80 animate-pulse">
                        <Sparkles size={12} />
                        <span>Zudlik</span>
                      </span>
                    )}
                  </div>

                  {/* Right Status Pill & Actions */}
                  <div className="flex items-center gap-2">
                    <StatusSelect
                      value={j.status}
                      onChange={(val) => onChangeJobStatus(j.id, val)}
                    />

                    {/* Prominent Payout button for completed jobs */}
                    {j.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setPayoutJobId(j.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        title={a.confirmPayment || "Ishchiga to'lov qilish"}
                      >
                        <Wallet size={13} />
                        <span>To'lov qilish</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetails(j)}
                        className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Batafsil ko'rish"
                        aria-label="Batafsil ko'rish"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingJob(j)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                        title={a.rejectWithReason}
                        aria-label={a.rejectWithReason}
                      >
                        <XCircle size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${j.title}" e'lonini to'liq o'chirib tashlaysizmi?`)) {
                            onDeleteJob(j.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title={a.deleteLabel}
                        aria-label={a.deleteLabel}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4-Column Bento Content Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Column 1: Job Info */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      {a.jobNameLabel || 'Ish nomi'}
                    </span>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedJobDetails(j)}
                      className="p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 hover:border-brand-primary/30 transition-all cursor-pointer group flex items-start gap-2.5 h-[72px]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 group-hover:bg-brand-primary group-hover:text-white transition-all shadow-2xs mt-0.5">
                        <Briefcase size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-brand-primary transition-colors leading-snug line-clamp-1">
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      {a.companyColumn || 'Korxona'}
                    </span>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => handleUserClick(j.employerId)} 
                      className="p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-2.5 h-[72px]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs group-hover:text-brand-primary transition-colors">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 group-hover:text-brand-primary truncate transition-colors">
                          {j.company || j.employerName || '—'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          ID: #{j.employerId.slice(0, 6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Worker Assignment - Modern Executive Worker Chip with Centered Popover */}
                  <div className="min-w-0 relative">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      {a.roleWorker}
                    </span>
                    {assignedWorker ? (
                      <div className="p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between gap-2 h-[72px]">
                        <div 
                          role="button"
                          tabIndex={0}
                          onClick={() => handleUserClick(j.workerId)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group text-left"
                        >
                          <div className="relative shrink-0">
                            {assignedWorker.avatarUrl ? (
                              <img src={assignedWorker.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/20 text-brand-primary font-bold text-xs flex items-center justify-center border border-brand-primary/20 shadow-2xs">
                                {(assignedWorker.name || j.workerName || 'I').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-brand-primary truncate transition-colors">
                                {assignedWorker.name || j.workerName || 'Ismsiz ishchi'}
                              </span>
                              {assignedWorker.isVerified && (
                                <CheckCircle2 size={12} className="text-brand-primary shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                              {assignedWorker.phone || 'Biriktirilgan'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUserClick(j.workerId)}
                            className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 shadow-2xs"
                            title={a.viewWorkerDetails || "Ishchi profilini ko'rish"}
                            aria-label="Ishchi profilini ko'rish"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssigningJobId(isAssigningThis ? null : j.id)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                              isAssigningThis
                                ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                                : 'bg-white text-slate-600 hover:text-brand-primary border-slate-200 hover:border-brand-primary/40 shadow-2xs'
                            }`}
                            title="Ishchini almashtirish"
                            aria-label="Ishchini almashtirish"
                          >
                            <span>Almashtirish</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isAssigningThis ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssigningJobId(isAssigningThis ? null : j.id)}
                        className={`w-full h-[72px] flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer group shadow-2xs border ${
                          isAssigningThis
                            ? 'bg-brand-primary/10 border-brand-primary text-brand-primary ring-2 ring-brand-primary/20'
                            : 'bg-slate-50/80 hover:bg-brand-primary/5 border-dashed border-slate-300 hover:border-brand-primary/50 text-slate-600 hover:text-brand-primary'
                        }`}
                      >
                        <UserPlus size={15} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
                        <span>{a.assignWorker}</span>
                      </button>
                    )}

                    {/* POPOVER SELECTION - Perfectly anchored beneath Column 3 */}
                    {isAssigningThis && (
                      <WorkerPopover
                        job={j}
                        currentWorkerId={j.workerId}
                        workers={workersList}
                        onClose={() => setAssigningJobId(null)}
                        onSelectWorker={(workerId) => {
                          setAssigningJobId(null);
                          if (!workerId) {
                            onChangeJobWorker?.(j.id, null);
                          } else {
                            const selectedW = users.find(u => u.id === workerId);
                            if (selectedW) {
                              setSelectedUser(selectedW);
                              setPendingWorkerJobId(j.id);
                            }
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Column 4: Timing & Schedule - Clean Attendance Block */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {a.timeColumn || 'Smena vaqti'}
                      </span>
                      <Clock size={12} className="text-slate-400" />
                    </div>
                    <div className="p-2.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-center h-[72px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900 font-mono tracking-tight">
                          {j.workTime || '09:00 — 18:00'}
                        </span>
                        {renderTimeWarningBadge(j)}
                      </div>
                      <div className="mt-1">
                        <ActualTiming job={j} />
                      </div>
                    </div>
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

/* ===================== WORKER SELECTION POPOVER ===================== */
interface WorkerPopoverProps {
  job: AdminJob;
  currentWorkerId?: string | null;
  workers: AdminUser[];
  onClose: () => void;
  onSelectWorker: (workerId: string | null) => void;
}

const WorkerPopover: React.FC<WorkerPopoverProps> = ({
  job,
  currentWorkerId,
  workers,
  onClose,
  onSelectWorker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filtered = workers.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.phone && w.phone.includes(q)) ||
      (w.skills && w.skills.some(s => s.toLowerCase().includes(q)))
    );
  });

  return (
    <>
      {/* Click-outside backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] animate-in fade-in duration-100"
        onClick={onClose}
      />

      {/* Floating Popover Container */}
      <div 
        ref={popoverRef}
        className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-full sm:w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <Users size={13} />
            </div>
            <div className="min-w-0">
              <h5 className="font-bold text-xs text-slate-800 truncate">Ishchi tanlash</h5>
              <p className="text-[10px] text-slate-400 truncate">{job.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ishchini qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Unassign option if someone is assigned */}
        {currentWorkerId && (
          <div className="p-2 border-b border-slate-100 bg-rose-50/40">
            <button
              type="button"
              onClick={() => onSelectWorker(null)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <UserX size={14} className="text-rose-500 shrink-0" />
                <span>Biriktirishni bekor qilish</span>
              </div>
              <span className="text-[10px] font-normal text-rose-400">Bo'shatish</span>
            </button>
          </div>
        )}

        {/* Workers List */}
        <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              <Users size={20} className="mx-auto text-slate-300 mb-1.5" />
              <span>Ishchi topilmadi</span>
            </div>
          ) : (
            filtered.map((w) => {
              const isSelected = w.id === currentWorkerId;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWorker(w.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80 overflow-hidden shadow-2xs">
                      {w.avatarUrl ? (
                        <img src={w.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (w.name || 'I').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs truncate leading-snug">{w.name || 'Ismsiz ishchi'}</p>
                        {w.isVerified && (
                          <CheckCircle2 size={12} className="text-brand-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {w.phone || w.region || '—'}
                      </p>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary bg-white px-2 py-0.5 rounded-md border border-brand-primary/20 shadow-2xs shrink-0">
                      <Check size={12} />
                      <span>Faol</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-brand-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                      Tanlash →
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

/* ===================== TIME WARNING BADGE ===================== */
const renderTimeWarningBadge = (job: AdminJob) => {
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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          <span>Kechikmoqda</span>
        </span>
      );
    }
  }

  return null;
};

/* ===================== WHAT ACTUALLY HAPPENED ===================== */
const ActualTiming: React.FC<{ job: AdminJob }> = ({ job }) => {
  const t = workTimingOf(job);

  if (job.status === 'open') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
        <CalendarClock size={11} className="text-slate-400 shrink-0" />
        <span>Rejalashtirilgan smena</span>
      </span>
    );
  }

  if (job.status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
        <Clock size={11} className="text-brand-primary shrink-0" />
        <span>Smena kutilmoqda</span>
      </span>
    );
  }

  if (job.status === 'in_progress') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ishlamoqda</span>
        </span>
        {t.startedAt && (
          <span className="text-slate-500 font-mono text-[10px]">({t.startedAt})</span>
        )}
      </div>
    );
  }

  if (job.status === 'completed') {
    if (!t.startedAt && !t.finishedAt) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          <span>Smena yakunlangan</span>
        </span>
      );
    }

    const late = t.startDelayMin !== null && t.startDelayMin > LATE_THRESHOLD_MIN;
    const ranOver = t.finishDelayMin !== null && t.finishDelayMin > LATE_THRESHOLD_MIN;

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 font-mono">
          <span className={late ? 'text-rose-600' : 'text-emerald-600'}>
            {t.startedAt ?? '—'}
          </span>
          <span className="text-slate-300">→</span>
          <span className={ranOver ? 'text-amber-600' : 'text-slate-700'}>
            {t.finishedAt ?? '—'}
          </span>
          {t.workedMin !== null && (
            <span className="text-slate-400 font-normal font-sans text-[10px]">({humanMinutes(t.workedMin)})</span>
          )}
        </div>
      </div>
    );
  }

  if (job.status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
        <XCircle size={11} className="text-rose-400 shrink-0" />
        <span>Bekor qilingan</span>
      </span>
    );
  }

  return null;
};
