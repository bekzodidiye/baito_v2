import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Lock, Check, X, Loader2, RefreshCw, Receipt, Landmark, Save } from 'lucide-react';
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

/** A shift settled by hand: money actually sent to a worker, and the invoice
 *  that recovers it from the company. Distinct from a withdrawal request,
 *  which is the worker asking; this is us having already paid. */
interface JobPayout {
  id: string;
  jobId: string;
  jobTitle: string | null;
  company: string | null;
  workerName: string | null;
  amount: number;
  receiptUrl: string;
  status: string;
  paidAt: string | null;
  invoiceNumber: string | null;
  invoiceAmount: number | null;
  invoiceSentTo: string | null;
  invoiceSentAt: string | null;
}

interface BankDetails {
  payoutCompanyName: string | null;
  payoutBankName: string | null;
  payoutBankAccount: string | null;
  payoutBankMfo: string | null;
  payoutCompanyInn: string | null;
  payoutCompanyAddress: string | null;
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
  const [tab, setTab] = useState<'withdrawals' | 'escrow' | 'payouts' | 'bank'>('withdrawals');
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

  const payouts = useQuery({
    queryKey: ['adminJobPayouts'],
    queryFn: async () => unwrapList(await apiClient('/admin/payouts')) as JobPayout[],
  });

  const bank = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => (await apiClient('/admin/settings')) as BankDetails,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
    queryClient.invalidateQueries({ queryKey: ['adminEscrow'] });
    queryClient.invalidateQueries({ queryKey: ['adminJobPayouts'] });
    queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
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

  const Tab = ({ id, label, count }: { id: typeof tab; label: string; count?: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
        tab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}{count !== undefined && <span className="opacity-70"> ({count})</span>}
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
        <Tab id="payouts" label="Qo'lda to'lovlar" count={payouts.data?.length ?? 0} />
        <Tab id="bank" label="Bank rekvizitlari" />
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
          {tab === 'bank' ? (
            <BankDetailsForm data={bank.data} onSaved={refreshAll} />
          ) : tab === 'payouts' ? (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Ish</th>
                  <th className="text-left font-semibold px-4 py-3">Ishchi</th>
                  <th className="text-left font-semibold px-4 py-3">To'langan</th>
                  <th className="text-left font-semibold px-4 py-3">Chek</th>
                  <th className="text-left font-semibold px-4 py-3">Hisob-faktura</th>
                  <th className="text-left font-semibold px-4 py-3">Sana</th>
                </tr>
              </thead>
              <tbody>
                {payouts.isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda…</td></tr>
                ) : (payouts.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Hali qo'lda to'lov qilinmagan
                  </td></tr>
                ) : (
                  (payouts.data ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{p.jobTitle ?? '—'}</span>
                        <span className="text-slate-400">{p.company ?? ''}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.workerName ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">{money(p.amount)}</td>
                      <td className="px-4 py-3">
                        <a href={p.receiptUrl} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 text-brand-primary font-semibold underline">
                          <Receipt size={13} /> Ochish
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {p.invoiceSentAt ? (
                          <span className="text-slate-700">
                            <span className="font-mono">{p.invoiceNumber}</span>
                            <span className="block text-slate-400">
                              {money(p.invoiceAmount ?? 0)} · {p.invoiceSentTo}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Yuborilmagan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{when(p.paidAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : tab === 'withdrawals' ? (
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

/** Our own bank details.
 *
 *  They go on the invoice a company receives after a shift is paid out. Until
 *  now there was nowhere to put them, which would have meant hard-coding an
 *  account number into the invoice template — the kind of thing that stays
 *  wrong for months because nothing ever reads it back.
 */
const BankDetailsForm: React.FC<{ data?: BankDetails; onSaved: () => void }> = ({ data, onSaved }) => {
  const [form, setForm] = useState<BankDetails>({
    payoutCompanyName: '', payoutBankName: '', payoutBankAccount: '',
    payoutBankMfo: '', payoutCompanyInn: '', payoutCompanyAddress: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Fills once the query resolves, and does not clobber what is being typed
  // if the query happens to refetch mid-edit.
  const key = data ? JSON.stringify(data) : null;
  if (data && key !== loadedFor) {
    setLoadedFor(key);
    setForm({
      payoutCompanyName: data.payoutCompanyName ?? '',
      payoutBankName: data.payoutBankName ?? '',
      payoutBankAccount: data.payoutBankAccount ?? '',
      payoutBankMfo: data.payoutBankMfo ?? '',
      payoutCompanyInn: data.payoutCompanyInn ?? '',
      payoutCompanyAddress: data.payoutCompanyAddress ?? '',
    });
  }

  const set = (k: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await apiClient('/admin/settings', { method: 'POST', body: JSON.stringify(form) });
      showToast('Bank rekvizitlari saqlandi', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.message || 'Saqlab bo`lmadi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields: [keyof BankDetails, string, string][] = [
    ['payoutCompanyName', 'Korxona nomi', 'Baito MChJ'],
    ['payoutBankName', 'Bank', 'Ipoteka Bank'],
    ['payoutBankAccount', 'Hisob raqami', '2020 8000 9000 0000 0001'],
    ['payoutBankMfo', 'MFO', '00873'],
    ['payoutCompanyInn', 'INN / STIR', '123456789'],
    ['payoutCompanyAddress', 'Manzil', "Toshkent sh., Chilonzor t."],
  ];

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Landmark size={16} className="text-slate-500" />
        <h3 className="font-bold text-slate-900 text-sm">To'lov rekvizitlarimiz</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Korxonaga yuboriladigan hisob-fakturada shu ma'lumotlar chiqadi.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map(([k, label, placeholder]) => (
          <label key={k} className="block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            <input
              type="text"
              value={form[k] ?? ''}
              onChange={set(k)}
              placeholder={placeholder}
              className="mt-1.5 w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-colors"
            />
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 h-11 px-5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Saqlash
      </button>
    </div>
  );
};
