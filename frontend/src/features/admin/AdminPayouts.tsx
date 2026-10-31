import React, { useState } from 'react';
import { money as sum } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Wallet, Check, X, Loader2, RefreshCw, Receipt, Landmark, Save, 
  CreditCard, ArrowUpRight, CheckCircle2, AlertCircle, Building2,
  FileText, ShieldCheck
} from 'lucide-react';
import { apiClient, unwrapList } from '../../api/client';
import { showToast } from '../../utils/toast';

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
  invoicePaidMethod: string | null;
  invoicePaidReference: string | null;
  invoicePaidDeclaredAt: string | null;
  invoicePaidReceiptUrl: string | null;
  invoiceConfirmedAt: string | null;
}

interface BankDetails {
  payoutCompanyName: string | null;
  payoutBankName: string | null;
  payoutBankAccount: string | null;
  payoutBankMfo: string | null;
  payoutCompanyInn: string | null;
  payoutCompanyAddress: string | null;
}

const money = (n: number) => sum(n, useAuthStore.getState().language);
const when = (s: string | null) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return `${d.toLocaleDateString('uz-UZ')} ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '—';
  }
};

export const AdminPayouts: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'withdrawals' | 'payouts' | 'bank'>('withdrawals');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    withdrawal: Withdrawal;
    action: 'approve' | 'reject';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [bankReference, setBankReference] = useState('');

  const withdrawals = useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: async () =>
      unwrapList(await apiClient('/admin/withdrawals?status=pending')) as Withdrawal[],
  });

  const confirmPayment = useMutation({
    mutationFn: async (jobId: string) =>
      apiClient(`/admin/jobs/${jobId}/payout/confirm-payment`, { method: 'POST' }),
    onSuccess: () => {
      showToast("To'lov muvaffaqiyatli tasdiqlandi", 'success');
      queryClient.invalidateQueries({ queryKey: ['adminJobPayouts'] });
    },
    onError: (e: any) => showToast(e?.message || 'Xatolik yuz berdi', 'error'),
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
    queryClient.invalidateQueries({ queryKey: ['adminJobPayouts'] });
    queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
  };

  const handleOpenDecision = (w: Withdrawal, action: 'approve' | 'reject') => {
    setDecisionReason('');
    setBankReference('');
    setDecisionModal({ withdrawal: w, action });
  };

  const handleExecuteDecision = async () => {
    if (!decisionModal) return;
    const { withdrawal: w, action } = decisionModal;

    if (!decisionReason || decisionReason.trim().length < 3) {
      showToast("Iltimos, audit jurnali uchun sababni yozing (kamida 3 belgi)", 'error');
      return;
    }

    setBusyId(w.id);
    try {
      await apiClient(`/admin/withdrawals/${w.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reason: decisionReason.trim(),
          reference: action === 'approve' && bankReference.trim() ? bankReference.trim() : null,
        }),
      });
      showToast(
        action === 'approve'
          ? "Yechish muvaffaqiyatli tasdiqlandi"
          : `Rad etildi — ${money(w.amountUzs)} balansga qaytarildi`,
        'success'
      );
      setDecisionModal(null);
      refreshAll();
    } catch (e: any) {
      showToast(e?.message || 'Amal bajarilmadi', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const pendingList = withdrawals.data ?? [];
  const pendingTotal = pendingList.reduce((s, w) => s + w.amountUzs, 0);
  const payoutsList = payouts.data ?? [];
  const totalSettledAmount = payoutsList.reduce((s, p) => s + (p.amount || 0), 0);
  const confirmedCount = payoutsList.filter(p => !!p.invoiceConfirmedAt).length;

  return (
    <div className="space-y-4">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Kutilayotgan Yechishlar</span>
            <Wallet size={16} className="text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 tabular-nums">
            {money(pendingTotal)}
          </div>
          <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {pendingList.length} ta navbatda
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">To'langan Ish Haqlar</span>
            <Receipt size={16} className="text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 tabular-nums">
            {money(totalSettledAmount)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
            <ArrowUpRight size={13} />
            {payoutsList.length} ta to'lov operatsiyasi
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Tasdiqlangan Fakturalar</span>
            <ShieldCheck size={16} className="text-blue-500" />
          </div>
          <div className="text-lg font-black text-blue-600 tabular-nums">
            {confirmedCount} ta
          </div>
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1">
            <FileText size={13} />
            Bank ko'chirmasi tekshirilgan
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Baito Rekvizitlari</span>
            <Landmark size={16} className="text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 truncate mt-0.5">
            {bank.data?.payoutBankName || "Ko'rsatilmagan"}
          </div>
          <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 mt-1">
            <CheckCircle2 size={13} />
            {bank.data?.payoutBankAccount ? "Faol hisob raqami" : "Sozlash kutilmoqda"}
          </div>
        </div>
      </div>

      {/* Tabs and Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('withdrawals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'withdrawals'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet size={14} />
            <span>{a.withdrawalRequests}</span>
            {pendingList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {pendingList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('payouts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'payouts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Receipt size={14} />
            <span>{a.manualPayouts}</span>
            {payoutsList.length > 0 && (
              <span className="ml-1 opacity-75 text-[10px]">
                ({payoutsList.length})
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'bank'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Landmark size={14} />
            <span>Bank rekvizitlari</span>
          </button>
        </div>

        <button
          onClick={refreshAll}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Yangilash"
          aria-label="Yangilash"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {tab === 'bank' ? (
          <BankDetailsForm data={bank.data} onSaved={refreshAll} />
        ) : tab === 'payouts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.jobLabel}</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.roleWorker}</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.paidLabel}</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">Chek</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">Hisob-faktura</th>
                  <th className="text-right font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.dateLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                      Yuklanmoqda…
                    </td>
                  </tr>
                ) : payoutsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Hali qo'lda to'lov qilinmagan
                    </td>
                  </tr>
                ) : (
                  payoutsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{p.jobTitle ?? '—'}</span>
                        <span className="text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 size={12} /> {p.company ?? 'Baito'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">{p.workerName ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-black text-slate-900 tabular-nums text-sm">
                          {money(p.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {p.receiptUrl ? (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                          >
                            <Receipt size={13} /> Chekni ko'rish
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.invoiceSentAt ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {p.invoiceNumber}
                              </span>
                              <span className="text-slate-500 font-semibold">
                                {money(p.invoiceAmount ?? 0)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Yuborildi: {p.invoiceSentTo}
                            </div>
                            {p.invoicePaidDeclaredAt && (
                              <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 w-fit">
                                <CheckCircle2 size={12} />
                                To'ladim dedi · {when(p.invoicePaidDeclaredAt)}
                                {p.invoicePaidReference ? ` · №${p.invoicePaidReference}` : ''}
                              </div>
                            )}
                            {p.invoicePaidReceiptUrl && (
                              <a
                                href={p.invoicePaidReceiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-brand-primary font-bold underline underline-offset-2 text-[11px]"
                              >
                                Bank chekini tekshirish
                              </a>
                            )}
                            {p.invoiceConfirmedAt ? (
                              <div className="text-[11px] text-emerald-800 font-black flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded w-fit">
                                <ShieldCheck size={12} />
                                Tasdiqlandi · {when(p.invoiceConfirmedAt)}
                              </div>
                            ) : p.invoicePaidDeclaredAt ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); confirmPayment.mutate(p.jobId); }}
                                disabled={confirmPayment.isPending}
                                className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-extrabold cursor-pointer transition-colors shadow-xs"
                              >
                                To'lovni tasdiqlash
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold text-[11px]">
                            <AlertCircle size={12} />
                            Faktura yuborilmagan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 font-medium">
                        {when(p.paidAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : tab === 'withdrawals' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.roleWorker}</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">So'ralgan Summa</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">Bank Kartasi</th>
                  <th className="text-left font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.dateLabel}</th>
                  <th className="text-right font-bold px-4 py-3.5 uppercase tracking-wider text-[11px]">Qaror</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                      Yuklanmoqda…
                    </td>
                  </tr>
                ) : pendingList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                      Kutilayotgan pul yechish so'rovlari yo'q
                    </td>
                  </tr>
                ) : (
                  pendingList.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block text-sm">{w.userName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{w.userPhone}</span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 tabular-nums text-base">
                        {money(w.amountUzs)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-slate-700 font-bold border border-slate-200">
                          <CreditCard size={13} className="text-slate-400" />
                          {w.bankCardMask || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-medium">
                        {when(w.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busyId === w.id}
                            onClick={() => handleOpenDecision(w, 'approve')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                          >
                            {busyId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Tasdiqlash
                          </button>
                          <button
                            disabled={busyId === w.id}
                            onClick={() => handleOpenDecision(w, 'reject')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold cursor-pointer hover:bg-rose-100 transition disabled:opacity-50"
                          >
                            <X size={13} />
                            Rad etish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-5 ${decisionModal.action === 'approve' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-rose-50 border-b border-rose-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {decisionModal.action === 'approve' ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                      <X size={18} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {decisionModal.action === 'approve' ? "Yechishni Tasdiqlash" : "Yechishni Rad Etish"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Audit jurnali uchun rasmiy qaror</p>
                  </div>
                </div>
                <button
                  onClick={() => setDecisionModal(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Foydalanuvchi:</span>
                  <span className="font-extrabold text-slate-900">{decisionModal.withdrawal.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Telefon:</span>
                  <span className="font-mono text-slate-700">{decisionModal.withdrawal.userPhone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Karta raqami:</span>
                  <span className="font-mono text-slate-700 font-bold">{decisionModal.withdrawal.bankCardMask || '—'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Yechilayotgan summa:</span>
                  <span className="font-black text-slate-900 text-sm tabular-nums">
                    {money(decisionModal.withdrawal.amountUzs)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Qaror sababi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={decisionModal.action === 'approve' ? "Masalan: Tranzaksiya o'tkazildi, chek tekshirildi" : "Masalan: Karta raqamida noaniqlik mavjud"}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  required
                />
              </div>

              {decisionModal.action === 'approve' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Bank ma'lumotnomasi / Tranzaksiya ID (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="Masalan: PAYME-98721345"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDecision}
                  disabled={busyId === decisionModal.withdrawal.id || !decisionReason.trim()}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-white text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                    decisionModal.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {busyId === decisionModal.withdrawal.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : decisionModal.action === 'approve' ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                  {decisionModal.action === 'approve' ? "Tasdiqlash" : "Rad etish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BankDetailsForm: React.FC<{ data?: BankDetails; onSaved: () => void }> = ({ data, onSaved }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [form, setForm] = useState<BankDetails>({
    payoutCompanyName: '', payoutBankName: '', payoutBankAccount: '',
    payoutBankMfo: '', payoutCompanyInn: '', payoutCompanyAddress: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

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
      showToast('Bank rekvizitlari muvaffaqiyatli saqlandi', 'success');
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
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Landmark size={18} className="text-indigo-600" />
        <h3 className="font-extrabold text-slate-900 text-sm">{a.ourPaymentDetails}</h3>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Korxonaga yuboriladigan rasmiy hisob-fakturalarda shu ma'lumotlar avtomatik ko'rsatiladi.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map(([k, label, placeholder]) => (
          <label key={k} className="block">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
            <input
              type="text"
              value={form[k] ?? ''}
              onChange={set(k)}
              placeholder={placeholder}
              className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-all"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Bank rekvizitlarini saqlash
        </button>
      </div>
    </div>
  );
};
