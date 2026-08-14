import React, { useState } from 'react';
import { AdminDispute, AdminJob } from './types';
import { AlertTriangle, ShieldCheck, ArrowRightLeft, DollarSign, CheckCircle2 } from 'lucide-react';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';

export const AdminDisputes: React.FC = () => {
  const { disputes, jobs, refresh } = useAdminData();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const disputeJobs = disputes.filter(d => d.status === 'open' || d.status === 'in_progress');

  const handleResolve = async (disputeId: string, jobId: string, winner: 'employer' | 'worker') => {
    setResolvingId(disputeId);
    try {
      await apiClient(`/admin/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: winner === 'worker' ? 'completed' : 'cancelled' })
      });
      await apiClient(`/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved', adminNotes: `Resolved in favor of ${winner}` })
      });
      refresh();
      (
        winner === 'worker'
          ? "Nizo hal qilindi: Escrow mablag'i Ishchiga o'tkazildi"
          : "Nizo hal qilindi: Escrow mablag'i Ish beruvchiga qaytarildi"
      );
    } catch(e) {
      console.error(e);
    }
    setResolvingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          <span>Nizolar va E'tirozlarni Hal Qilish (Disputes)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Ish beruvchi va ishchi o'rtasidagi kelishmovchiliklar boyicha Escrow mablag'ini taqsimlash
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disputeJobs.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold">
            Hozirda hech qanday faol nizo yoki shikoyatlar mavjud emas
          </div>
        ) : (
          disputeJobs.map((j) => (
            <div
              key={j.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    Nizo Ko'rilmoqda
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <DollarSign size={13} />
                    {jobs.find(job => job.id === j.jobId)?.salary || 'N/A'}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{j.jobTitle}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{j.employerName} • {j.workerName}</p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-3 text-xs text-slate-700 font-medium space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <ArrowRightLeft size={14} className="text-slate-400" />
                    Shikoyat mazmuni:
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {j.reason || "Ish topshirilgan muddatda sifatli bajarilmadi / ish beruvchi to'lovni tasdiqlamayapti"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleResolve(j.id, j.jobId, 'employer')}
                  disabled={resolvingId === j.id}
                  className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center disabled:opacity-50"
                >
                  Ish beruvchiga qaytarish
                </button>
                <button
                  onClick={() => handleResolve(j.id, j.jobId, 'worker')}
                  disabled={resolvingId === j.id}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  Ishchiga to'lash
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
