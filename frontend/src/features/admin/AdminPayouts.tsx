import React, { useState, useMemo } from 'react';
import { money as sum } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Wallet, Check, X, Loader2, RefreshCw, Receipt, Landmark, Save, 
  CreditCard, ArrowUpRight, CheckCircle2, AlertCircle, Building2,
  FileText, ShieldCheck, Search, Clock, ExternalLink, Eye,
  CheckCircle, AlertTriangle
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
  const [tab, setTab] = useState<'payouts' | 'withdrawals' | 'bank'>('payouts');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters and search states
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'pending_confirm' | 'invoiced' | 'confirmed' | 'no_invoice'>('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'all' | 'pending' | 'paid' | 'canceled'>('pending');

  // Receipt viewer modal state
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; title: string } | null>(null);

  // Decision Modal State for Withdrawals
  const [decisionModal, setDecisionModal] = useState<{
    withdrawal: Withdrawal;
    action: 'approve' | 'reject';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [bankReference, setBankReference] = useState('');

  // Queries
  const withdrawals = useQuery({
    queryKey: ['adminWithdrawals', withdrawalStatusFilter],
    queryFn: async () => {
      const param = withdrawalStatusFilter === 'all' ? 'all' : withdrawalStatusFilter;
      const res = await apiClient(`/admin/withdrawals?status=${param}`);
      return unwrapList(res) as Withdrawal[];
    },
  });

  const payouts = useQuery({
    queryKey: ['adminJobPayouts'],
    queryFn: async () => unwrapList(await apiClient('/admin/payouts')) as JobPayout[],
  });

  const bank = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => (await apiClient('/admin/settings')) as BankDetails,
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

  // Calculations
  const rawWithdrawals = withdrawals.data ?? [];
  const pendingWithdrawalsCount = rawWithdrawals.filter(w => w.status === 'pending').length;
  const pendingWithdrawalsTotal = rawWithdrawals
    .filter(w => w.status === 'pending')
    .reduce((s, w) => s + w.amountUzs, 0);

  const payoutsList = payouts.data ?? [];
  const totalSettledAmount = payoutsList.reduce((s, p) => s + (p.amount || 0), 0);
  const confirmedCount = payoutsList.filter(p => !!p.invoiceConfirmedAt).length;
  const pendingConfirmCount = payoutsList.filter(
    p => !!p.invoicePaidDeclaredAt && !p.invoiceConfirmedAt
  ).length;

  // Filtered Payouts
  const filteredPayouts = useMemo(() => {
    return payoutsList.filter((p) => {
      // Status filter
      if (payoutStatusFilter === 'pending_confirm') {
        if (!p.invoicePaidDeclaredAt || p.invoiceConfirmedAt) return false;
      } else if (payoutStatusFilter === 'invoiced') {
        if (!p.invoiceSentAt || p.invoicePaidDeclaredAt || p.invoiceConfirmedAt) return false;
      } else if (payoutStatusFilter === 'confirmed') {
        if (!p.invoiceConfirmedAt) return false;
      } else if (payoutStatusFilter === 'no_invoice') {
        if (p.invoiceSentAt) return false;
      }

      // Search query
      if (payoutSearch.trim()) {
        const q = payoutSearch.toLowerCase().trim();
        const matchesJob = p.jobTitle?.toLowerCase().includes(q);
        const matchesCompany = p.company?.toLowerCase().includes(q);
        const matchesWorker = p.workerName?.toLowerCase().includes(q);
        const matchesInvoice = p.invoiceNumber?.toLowerCase().includes(q);
        const matchesEmail = p.invoiceSentTo?.toLowerCase().includes(q);
        if (!matchesJob && !matchesCompany && !matchesWorker && !matchesInvoice && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [payoutsList, payoutStatusFilter, payoutSearch]);

  // Filtered Withdrawals
  const filteredWithdrawals = useMemo(() => {
    return rawWithdrawals.filter((w) => {
      if (withdrawalSearch.trim()) {
        const q = withdrawalSearch.toLowerCase().trim();
        const matchesName = w.userName?.toLowerCase().includes(q);
        const matchesPhone = w.userPhone?.toLowerCase().includes(q);
        const matchesCard = w.bankCardMask?.toLowerCase().includes(q);
        const matchesRef = w.reference?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCard && !matchesRef) {
          return false;
        }
      }
      return true;
    });
  }, [rawWithdrawals, withdrawalSearch]);

  const hasBankConfigured = Boolean(bank.data?.payoutBankName && bank.data?.payoutBankAccount);

  return (
    <div className="space-y-4 pb-10">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Withdrawals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Kutilayotgan Yechishlar</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={15} />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tabular-nums">
            {money(pendingWithdrawalsTotal)}
          </div>
          <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingWithdrawalsCount} ta so'rov navbatda</span>
          </div>
        </div>

        {/* Card 2: Settled Wages */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">To'langan Ish Haqlar</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt size={15} />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tabular-nums">
            {money(totalSettledAmount)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
            <ArrowUpRight size={13} />
            <span>{payoutsList.length} ta to'lov operatsiyasi</span>
          </div>
        </div>

        {/* Card 3: Invoices Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Tasdiqlangan Fakturalar</span>
            <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-lg font-black text-brand-primary tabular-nums">
            {confirmedCount} ta
          </div>
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1">
            {pendingConfirmCount > 0 ? (
              <span className="text-amber-600 font-extrabold flex items-center gap-1">
                <Clock size={12} className="animate-spin text-amber-500" />
                {pendingConfirmCount} ta tasdiqlash kutilmoqda
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <CheckCircle2 size={12} className="text-emerald-500" />
                Bank ko'chirmasi tekshirilgan
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Bank Details */}
        <div 
          onClick={() => setTab('bank')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-indigo-300 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Baito Rekvizitlari</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Landmark size={15} />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-800 truncate mt-0.5">
            {bank.data?.payoutBankName ? bank.data.payoutBankName : "Bank belgilanmagan"}
          </div>
          <div className="text-[11px] font-bold flex items-center gap-1 mt-1">
            {hasBankConfigured ? (
              <span className="text-indigo-600 flex items-center gap-1">
                <CheckCircle2 size={12} />
                H/R: {bank.data?.payoutBankAccount?.slice(0, 8)}... (Faol)
              </span>
            ) : (
              <span className="text-rose-500 font-bold flex items-center gap-1 underline underline-offset-2">
                <AlertCircle size={12} />
                Rekvizitlarni sozlash →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab 1: Payouts & Invoices */}
          <button
            type="button"
            onClick={() => setTab('payouts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'payouts'
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Receipt size={14} />
            <span>Ish haqi to'lovlari & Fakturalar</span>
            {payoutsList.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                tab === 'payouts' ? 'bg-white text-brand-primary' : 'bg-slate-200 text-slate-700'
              }`}>
                {payoutsList.length}
              </span>
            )}
            {pendingConfirmCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 animate-pulse">
                {pendingConfirmCount}
              </span>
            )}
          </button>

          {/* Tab 2: Withdrawals */}
          <button
            type="button"
            onClick={() => setTab('withdrawals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'withdrawals'
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Wallet size={14} />
            <span>{a.withdrawalRequests}</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          {/* Tab 3: Bank Details */}
          <button
            type="button"
            onClick={() => setTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'bank'
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Landmark size={14} />
            <span>Bank rekvizitlari</span>
          </button>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Yangilash"
          aria-label="Yangilash"
        >
          <RefreshCw size={15} className={payouts.isFetching || withdrawals.isFetching ? 'animate-spin text-brand-primary' : ''} />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {tab === 'bank' ? (
          <BankDetailsForm data={bank.data} onSaved={refreshAll} />
        ) : tab === 'payouts' ? (
          <div>
            {/* Payouts Filter Bar */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ish, korxona, ishchi yoki INV- raqami..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
                  style={{ outline: 'none' }}
                />
                {payoutSearch && (
                  <button
                    type="button"
                    onClick={() => setPayoutSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'Barchasi', count: payoutsList.length },
                  { id: 'pending_confirm', label: '⚡ Tasdiqlash kutilmoqda', count: pendingConfirmCount },
                  { id: 'invoiced', label: "To'lov kutilmoqda", count: payoutsList.filter(p => !!p.invoiceSentAt && !p.invoicePaidDeclaredAt && !p.invoiceConfirmedAt).length },
                  { id: 'confirmed', label: 'Tasdiqlangan', count: confirmedCount },
                  { id: 'no_invoice', label: 'Fakturasiz', count: payoutsList.filter(p => !p.invoiceSentAt).length },
                ].map((item) => {
                  const isActive = payoutStatusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPayoutStatusFilter(item.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payouts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                  <tr>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px] min-w-[200px]">{a.jobLabel} va Korxona</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px] min-w-[140px]">{a.roleWorker}</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px] min-w-[130px]">{a.paidLabel}</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px] min-w-[250px]">Hisob-faktura & Tushum</th>
                    <th className="text-right font-black px-4 py-3.5 uppercase tracking-wider text-[11px] min-w-[120px]">{a.dateLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand-primary" />
                        Yuklanmoqda…
                      </td>
                    </tr>
                  ) : filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                        <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">To'lovlar topilmadi</p>
                        <p className="text-xs text-slate-400 mt-0.5">Filtr yoki qidiruv so'zini o'zgartirib ko'ring</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayouts.map((p) => {
                      const isDeclaredPending = Boolean(p.invoicePaidDeclaredAt && !p.invoiceConfirmedAt);
                      const isConfirmed = Boolean(p.invoiceConfirmedAt);
                      const isInvoiced = Boolean(p.invoiceSentAt && !p.invoicePaidDeclaredAt && !p.invoiceConfirmedAt);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Job & Company */}
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block text-xs leading-snug">
                              {p.jobTitle ?? '—'}
                            </span>
                            <span className="text-slate-500 font-medium flex items-center gap-1.5 mt-1 text-[11px]">
                              <Building2 size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{p.company ?? 'Baito hamkori'}</span>
                            </span>
                          </td>

                          {/* Worker */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {(p.workerName || 'I').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">{p.workerName ?? '—'}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Wage Settled */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <span className="font-black text-slate-900 tabular-nums text-sm block">
                                {money(p.amount)}
                              </span>
                              {p.receiptUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingReceipt({ url: p.receiptUrl, title: p.workerName ? `${p.workerName}ga to'lov cheki` : "To'lov cheki" })}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors cursor-pointer border border-emerald-200/60"
                                >
                                  <Eye size={11} /> Chekni ko'rish
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">—</span>
                              )}
                            </div>
                          </td>

                          {/* Invoice & Status */}
                          <td className="px-4 py-3.5">
                            {p.invoiceSentAt ? (
                              <div className="space-y-1.5">
                                {/* Invoice number and amount */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                                    {p.invoiceNumber}
                                  </span>
                                  <span className="text-slate-700 font-bold tabular-nums text-xs">
                                    {money(p.invoiceAmount ?? 0)}
                                  </span>
                                </div>

                                {/* Sent recipient */}
                                <div className="text-[11px] text-slate-400 truncate">
                                  {p.invoiceSentTo ? (
                                    <span>Yuborildi: <strong className="text-slate-600 font-medium">{p.invoiceSentTo}</strong></span>
                                  ) : (
                                    <span className="text-slate-400 italic">Email kiritilmagan</span>
                                  )}
                                </div>

                                {/* Single Clear Status Badge */}
                                {isConfirmed ? (
                                  <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200/80 shadow-2xs">
                                      <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                                      <span>Tasdiqlandi · {when(p.invoiceConfirmedAt)}</span>
                                    </div>
                                    {p.invoicePaidReceiptUrl && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setViewingReceipt({ url: p.invoicePaidReceiptUrl!, title: `Bank to'lov cheki (${p.invoiceNumber})` })}
                                          className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary/80 font-bold text-[11px] underline underline-offset-2 cursor-pointer"
                                        >
                                          <Receipt size={12} /> Bank chekini tekshirish
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : isDeclaredPending ? (
                                  <div className="space-y-1.5 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                                    <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1.5">
                                      <Clock size={13} className="text-amber-600 shrink-0 animate-pulse" />
                                      <span>To'ladim dedi · {when(p.invoicePaidDeclaredAt)}</span>
                                    </div>

                                    {p.invoicePaidReference && (
                                      <div className="text-[10px] text-amber-700 font-mono">
                                        Ma'lumotnoma: <strong>№{p.invoicePaidReference}</strong>
                                      </div>
                                    )}

                                    {p.invoicePaidReceiptUrl && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setViewingReceipt({ url: p.invoicePaidReceiptUrl!, title: `Bank kvitansiyasi (${p.invoiceNumber})` })}
                                          className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary/80 font-bold text-[11px] underline underline-offset-2 cursor-pointer"
                                        >
                                          <Receipt size={12} /> Korxona bank chekini ko'rish
                                        </button>
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => confirmPayment.mutate(p.jobId)}
                                      disabled={confirmPayment.isPending}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                      {confirmPayment.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                                      <span>To'lovni tasdiqlash</span>
                                    </button>
                                  </div>
                                ) : isInvoiced ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/80">
                                    <Clock size={12} className="text-blue-500 shrink-0" />
                                    <span>To'lov kutilmoqda (Faktura yuborilgan)</span>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-bold text-[11px] border border-amber-200/60">
                                <AlertCircle size={12} className="shrink-0" />
                                <span>Faktura yuborilmagan</span>
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 text-right text-slate-500 font-medium whitespace-nowrap">
                            {when(p.paidAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'withdrawals' ? (
          <div>
            {/* Withdrawals Filter Bar */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ishchi ismi, telefon yoki karta raqami..."
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
                  style={{ outline: 'none' }}
                />
                {withdrawalSearch && (
                  <button
                    type="button"
                    onClick={() => setWithdrawalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'pending', label: 'Kutilmoqda' },
                  { id: 'paid', label: 'Tasdiqlangan' },
                  { id: 'canceled', label: 'Rad etilgan' },
                  { id: 'all', label: 'Barchasi' },
                ].map((item) => {
                  const isActive = withdrawalStatusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWithdrawalStatusFilter(item.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                  <tr>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.roleWorker}</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px]">Bank Kartasi</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px]">So'ralgan Summa</th>
                    <th className="text-left font-black px-4 py-3.5 uppercase tracking-wider text-[11px]">{a.dateLabel}</th>
                    <th className="text-right font-black px-4 py-3.5 uppercase tracking-wider text-[11px]">Holat & Qaror</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand-primary" />
                        Yuklanmoqda…
                      </td>
                    </tr>
                  ) : filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                        <p className="font-bold text-slate-700 text-sm">So'rovlar mavjud emas</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ushbu holat bo'yicha hech qanday yechish so'rovi yo'q</p>
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map((w) => {
                      const isPending = w.status === 'pending';
                      const isApproved = w.status === 'paid' || w.status === 'approved';
                      const isRejected = w.status === 'canceled' || w.status === 'rejected';

                      return (
                        <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block text-xs">{w.userName || 'Foydalanuvchi'}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{w.userPhone || '—'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-slate-800 font-bold border border-slate-200">
                              <CreditCard size={13} className="text-slate-400 shrink-0" />
                              <span>{w.bankCardMask || 'Karta biriktirilgan'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-black text-slate-900 tabular-nums text-sm">
                            {money(w.amountUzs)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">
                            {when(w.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busyId === w.id}
                                  onClick={() => handleOpenDecision(w, 'approve')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50 active:scale-95"
                                >
                                  {busyId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  <span>Tasdiqlash</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === w.id}
                                  onClick={() => handleOpenDecision(w, 'reject')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold cursor-pointer hover:bg-rose-100 transition disabled:opacity-50 active:scale-95"
                                >
                                  <X size={13} />
                                  <span>Rad etish</span>
                                </button>
                              </div>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/80">
                                <CheckCircle size={12} className="text-emerald-600" />
                                <span>O'tkazilgan{w.reference ? ` · Ref: ${w.reference}` : ''}</span>
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200/80">
                                <X size={12} className="text-rose-600" />
                                <span>Rad etilgan</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">{w.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {/* Decision Modal for Withdrawals */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-5 ${decisionModal.action === 'approve' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-rose-50 border-b border-rose-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {decisionModal.action === 'approve' ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Check size={18} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <X size={18} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {decisionModal.action === 'approve' ? "Yechishni Tasdiqlash" : "Yechishni Rad Etish"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Audit jurnali uchun rasmiy qaror</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Foydalanuvchi:</span>
                  <span className="font-extrabold text-slate-900">{decisionModal.withdrawal.userName || 'Foydalanuvchi'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Telefon:</span>
                  <span className="font-mono text-slate-700">{decisionModal.withdrawal.userPhone || '—'}</span>
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
                  placeholder={decisionModal.action === 'approve' ? "Masalan: Tranzaksiya o'tkazildi, bank cheki tekshirildi" : "Masalan: Karta raqamida noaniqlik mavjud"}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all"
                  style={{ outline: 'none' }}
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
                    placeholder="Masalan: PAYME-98721345 yoki Tranzaksiya №"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all"
                    style={{ outline: 'none' }}
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
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-white text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95 ${
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
                  <span>{decisionModal.action === 'approve' ? "Tasdiqlash" : "Rad etish"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                  <Receipt size={16} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs truncate">{viewingReceipt.title}</h4>
                  <p className="text-[10px] text-slate-400">To'lov hujjati / kvitansiya</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={viewingReceipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Yangi oynada ochish"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-100/50 min-h-[300px]">
              <img
                src={viewingReceipt.url}
                alt="Chek"
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-xs border border-slate-200 bg-white"
                onError={(e) => {
                  // Fallback for non-image or broken links
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'text-center p-8 space-y-2';
                    fallback.innerHTML = `
                      <p class="font-bold text-slate-700 text-xs">Faylni brauzerda to'g'ridan-to'g'ri ko'rish imkoni yo'q</p>
                      <a href="${viewingReceipt.url}" target="_blank" rel="noreferrer" class="inline-block px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold">Yangi oynada ochish</a>
                    `;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Yopish
              </button>
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

  const fields: [keyof BankDetails, string, string, string][] = [
    ['payoutCompanyName', 'Korxona rasmiy nomi', 'Baito MChJ', 'Yuridik shaxs nomi'],
    ['payoutBankName', 'Xizmat ko`rsatuvchi Bank', 'Ipoteka Bank ATIB', 'Bank to`liq nomi'],
    ['payoutBankAccount', 'Hisob-kitob raqami (H/R)', '20208000900000000001', '20 ta raqamdan iborat'],
    ['payoutBankMfo', 'Bank MFO kodi', '00873', '5 ta raqam'],
    ['payoutCompanyInn', 'Korxona STIR / INN', '123456789', '9 ta raqam'],
    ['payoutCompanyAddress', 'Yuridik Manzil', "Toshkent sh., Chilonzor t., 1-mavze", 'Pochta manzili'],
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Landmark size={18} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-sm">{a.ourPaymentDetails}</h3>
          <p className="text-xs text-slate-500">
            Ish beruvchilarga yuboriladigan hisob-fakturalarda va to'lov sahifasida ushbu rekvizitlar ko'rinadi.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {fields.map(([k, label, placeholder, hint]) => (
          <label key={k} className="block space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{label}</span>
              <span className="text-[10px] text-slate-400">{hint}</span>
            </div>
            <input
              type="text"
              value={form[k] ?? ''}
              onChange={set(k)}
              placeholder={placeholder}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
              style={{ outline: 'none' }}
            />
          </label>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-brand-primary text-white font-black text-xs hover:bg-brand-primary/95 transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-brand-primary/20 active:scale-95"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          <span>Bank rekvizitlarini saqlash</span>
        </button>
      </div>
    </div>
  );
};
