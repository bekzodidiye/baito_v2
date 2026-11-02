import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import {
  AlertTriangle, ArrowRightLeft, DollarSign, CheckCircle2, ShieldAlert,
  Building2, User, Scale, Clock, Check, AlertCircle, FileText
} from 'lucide-react';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';
import { showToast } from '../../utils/toast';

export const AdminDisputes: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const { disputes, jobs, refresh } = useAdminData();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const disputeJobs = disputes.filter(d => d.status === 'open' || d.status === 'in_progress');

  const handleResolve = async (disputeId: string, _jobId: string, winner: 'employer' | 'worker') => {
    setResolvingId(disputeId);
    try {
      await apiClient(`/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ winner, reason: `Resolved in favor of ${winner}` })
      });
      showToast(winner === 'employer' ? "Mablag' ish beruvchiga qaytarildi" : "Mablag' ishchiga to'lab berildi");
      refresh();
    } catch(e: any) {
      console.error("Dispute resolution failed:", e);
      showToast(e?.message || 'Xatolik yuz berdi');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faol nizolar</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{disputeJobs.length} ta holat</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hakamlik holati</span>
            <Scale size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-600">Arbitraj faol</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Eskrou himoyasi</span>
            <ShieldAlert size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">Muzlatilgan balans</div>
        </div>
      </div>

      {/* Header Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <AlertTriangle size={18} />
          </div>
          <span>{a.disputesTitle}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {a.disputesSubtitle}
        </p>
      </div>

      {/* Dispute Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disputeJobs.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">{a.noDisputesFound}</p>
            <p className="text-xs text-slate-400 mt-1">Platformada hal qilinmagan nizolar mavjud emas</p>
          </div>
        ) : (
          disputeJobs.map((j) => {
            const relatedJob = jobs.find(job => job.id === j.jobId);
            return (
              <div
                key={j.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-amber-300 transition-all shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                      {a.disputeReviewing}
                    </span>
                    <span className="text-xs font-black font-mono text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                      <DollarSign size={13} />
                      <span>{relatedJob?.salary ? (parseFloat(relatedJob.salary)).toLocaleString('uz-UZ') + ' UZS' : 'Muzlatilgan'}</span>
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-base leading-snug">{j.jobTitle}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      {j.employerName}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {j.workerName}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4 text-xs text-slate-700 font-medium space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRightLeft size={14} className="text-amber-500" />
                      <span>{a.complaintDetails}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {j.reason || a.complaintDefaultReason}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleResolve(j.id, j.jobId, 'employer')}
                    disabled={resolvingId === j.id}
                    className="flex-1 py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black rounded-xl border border-red-200 transition-all cursor-pointer text-center disabled:opacity-50 shadow-2xs active:scale-95"
                  >
                    {a.refundEmployer}
                  </button>
                  <button
                    onClick={() => handleResolve(j.id, j.jobId, 'worker')}
                    disabled={resolvingId === j.id}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs active:scale-95"
                  >
                    <CheckCircle2 size={14} />
                    <span>{a.payWorker}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
