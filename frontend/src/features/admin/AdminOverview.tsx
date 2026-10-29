import React from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { counted } from '../../utils/plural';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminStats } from './types';
import { Users, Briefcase, DollarSign, ArrowUpRight, Clock, CheckCircle2, ShieldCheck, FileCheck } from 'lucide-react';
import { LoadingOrb } from "@/components/ui/loading-orb";

interface AdminOverviewProps {
  stats: AdminStats | null;
  loading: boolean;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ stats, loading }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  if (loading && !stats) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8">
        <LoadingOrb size={34} variant="working" label="Yuklanmoqda..." />
      </div>
    );
  }

  const formatSum = (val?: number) => {
    return (val || 0).toLocaleString('uz-UZ') + ' UZS';
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">{a.commissionRevenue}</span>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black">{formatSum(stats?.totalRevenue)}</div>
          <p className="text-[11px] text-blue-200 mt-2 font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> {a.platformCommissionNote}
          </p>
        </div>

        {/* What the platform owes workers */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{a.owedToWorkers}</span>
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatSum(stats?.totalOwedToWorkers)}</div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">{a.owedToWorkersNote}</p>
        </div>

        {/* Users Metric */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{a.usersLabel}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalUsers || 0}</div>
          <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{counted(stats?.workersCount || 0, a.workersShort, language)}</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{counted(stats?.employersCount || 0, a.employersShort, language)}</span>
          </div>
        </div>

        {/* Jobs Metric */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{a.totalPostings}</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalJobs || 0}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-500">
            <span className="text-emerald-600">{stats?.openJobsCount || 0} {a.openShort}</span>
            <span>•</span>
            <span className="text-amber-600">{stats?.activeJobsCount || 0} {a.inProgressShort}</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{counted(stats?.completedJobsCount || 0, a.postingsShort, language)}</div>
            <p className="text-xs text-slate-500 font-medium">{a.completedAndPaid}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{counted(stats?.totalApplications || 0, a.applicationsShort, language)}</div>
            <p className="text-xs text-slate-500 font-medium">{a.applicationsFromWorkers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
            <FileCheck size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{counted(stats?.totalTransactions || 0, a.transfersShort, language)}</div>
            <p className="text-xs text-slate-500 font-medium">{a.financialTransactionsDone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
