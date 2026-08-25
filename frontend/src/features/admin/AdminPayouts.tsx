import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Lock, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { apiClient, unwrapList } from '../../api/client';
import { showToast } from '../../utils/toast';

/**
 * Payout requests and frozen wages.
 *
 * Both existed only in the database before: a withdrawal debited the worker's
 * balance and then sat as `pending` forever because nothing could act on it,
 * and a disputed job's escrow could not be released or returned at all.
 */

interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  bankCardMask: string | null;
  amountUzs: number;
  status: string;
  reference: string | null;
  createdAt: string | null;
}

interface EscrowHold {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  employerId: string;
  employerName: string;
  amountUzs: number;
  createdAt: string | null;
}

const money = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
const when = (s: string | null) => (s ? new Date(s).toLocaleString('uz-UZ') : '—');

export const AdminPayouts: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'withdrawals' | 'escrow'>('withdrawals');
  const [busyId, setBusyId] = useState<string | null>(null);

  const withdrawals = useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: async () =>
      unwrapList(await apiClient('/admin/withdrawals?status=pending')) as Withdrawal[],
  });

  const escrow = useQuery({
    queryKey: ['adminEscrow'],
    queryFn: async () => unwrapList(await apiClient('/admin/escrow')) as EscrowHold[],
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
    queryClient.invalidateQueries({ queryKey: ['adminEscrow'] });
  };

  // Every one of these moves real money, so each requires a typed reason that
  // lands in the audit log next to the administrator's name.
  const decideWithdrawal = async (w: Withdrawal, action: 'approve' | 'reject') => {
    const verb = action === 'approve' ? 'tasdiqlash' : 'rad etish';
    const reason = window.prompt(
      `${money(w.amountUzs)} — ${w.userName}\n\n${verb} sababi (audit jurnaliga yoziladi):`,
    );
    if (!reason || reason.trim().length < 3) return;

    let reference: string | null = null;
    if (action === 'approve') {
      reference = window.prompt("Bank ma'lumotnomasi (ixtiyoriy):") || null;
    }

    setBusyId(w.id);
    try {
      await apiClient(`/admin/withdrawals/${w.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason: reason.trim(), reference }),
      });
      showToast(
        action === 'approve'
          ? "Yechish tasdiqlandi"
          : `Rad etildi — ${money(w.amountUzs)} balansga qaytarildi`,
      );
      refreshAll();
    } catch (e: any) {
      showToast(e?.message || 'Amal bajarilmadi');
    } finally {
      setBusyId(null);
    }
  };

  const decideEscrow = async (h: EscrowHold, action: 'release' | 'refund') => {
    let workerId: string | null = null;
    if (action === 'release') {
      workerId = window.prompt("To'lov chiqariladigan ishchining ID raqami:");
      if (!workerId) return;
    }
    const reason = window.prompt(
      `${money(h.amountUzs)} — "${h.jobTitle}"\n\nQaror sababi (audit jurnaliga yoziladi):`,
    );
    if (!reason || reason.trim().length < 3) return;

    setBusyId(h.id);
    try {
      await apiClient(`/admin/jobs/${h.jobId}/escrow`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: reason.trim(), workerId }),
      });
      showToast(action === 'release' ? "To'lov chiqarildi" : 'Mablag\' qaytarildi');
      refreshAll();
    } catch (e: any) {
      showToast(e?.message || 'Amal bajarilmadi');
    } finally {
      setBusyId(null);
    }
  };

  const pendingTotal = (withdrawals.data ?? []).reduce((s, w) => s + w.amountUzs, 0);
  const heldTotal = (escrow.data ?? []).reduce((s, h) => s + h.amountUzs, 0);

  const Tab = ({ id, label, count }: { id: typeof tab; label: string; count: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
        tab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Wallet size={15} /> Kutilayotgan yechishlar
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {money(pendingTotal)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Lock size={15} /> Muzlatilgan mablag'
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {money(heldTotal)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80">
        <Tab id="withdrawals" label="Yechish so'rovlari" count={withdrawals.data?.length ?? 0} />
        <Tab id="escrow" label="Escrow" count={escrow.data?.length ?? 0} />
        <button
          onClick={refreshAll}
          className="ml-auto p-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
          aria-label="Yangilash"
        >
          <RefreshCw size={15} className="text-slate-600" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'withdrawals' ? (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Ishchi</th>
                  <th className="text-left font-semibold px-4 py-3">Summa</th>
                  <th className="text-left font-semibold px-4 py-3">Karta</th>
                  <th className="text-left font-semibold px-4 py-3">Sana</th>
                  <th className="text-right font-semibold px-4 py-3">Qaror</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda…</td></tr>
                ) : (withdrawals.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Kutilayotgan so'rov yo'q
                  </td></tr>
                ) : (
                  (withdrawals.data ?? []).map((w) => (
                    <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{w.userName}</span>
                        <span className="text-slate-400 font-mono">{w.userPhone}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                        {money(w.amountUzs)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{w.bankCardMask || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{when(w.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busyId === w.id}
                            onClick={() => decideWithdrawal(w, 'approve')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Tasdiqlash
                          </button>
                          <button
                            disabled={busyId === w.id}
                            onClick={() => decideWithdrawal(w, 'reject')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 font-bold cursor-pointer hover:bg-rose-200 disabled:opacity-50"
                          >
                            <X size={13} /> Rad etish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Ish e'loni</th>
                  <th className="text-left font-semibold px-4 py-3">Ish beruvchi</th>
                  <th className="text-left font-semibold px-4 py-3">Summa</th>
                  <th className="text-left font-semibold px-4 py-3">Sana</th>
                  <th className="text-right font-semibold px-4 py-3">Qaror</th>
                </tr>
              </thead>
              <tbody>
                {escrow.isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda…</td></tr>
                ) : (escrow.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Muzlatilgan mablag' yo'q
                  </td></tr>
                ) : (
                  (escrow.data ?? []).map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{h.jobTitle}</span>
                        <span className="text-slate-400 font-mono">{h.jobStatus}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{h.employerName}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                        {money(h.amountUzs)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{when(h.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busyId === h.id}
                            onClick={() => decideEscrow(h, 'release')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Ishchiga chiqarish
                          </button>
                          <button
                            disabled={busyId === h.id}
                            onClick={() => decideEscrow(h, 'refund')}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-pointer hover:bg-slate-200 disabled:opacity-50"
                          >
                            Qaytarish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
