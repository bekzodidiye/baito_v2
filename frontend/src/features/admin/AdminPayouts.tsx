import React, { useState, useMemo } from 'react';
import { money as sum } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Wallet, Check, X, Loader2, RefreshCw, Receipt, Landmark, Save, 
  CreditCard, ArrowUpRight, CheckCircle2, AlertCircle, Building2,
  FileText, ShieldCheck, Search, Clock, ExternalLink, Eye,
  CheckCircle, AlertTriangle, Download, Mail, Copy, FileCheck
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

  // Bank reconciliation modal state (employer payment verification)
  const [reconcileModal, setReconcileModal] = useState<JobPayout | null>(null);

  // Payout audit detail modal state
  const [auditDetailModal, setAuditDetailModal] = useState<JobPayout | null>(null);

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
      setReconcileModal(null);
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

  const totalWageSum = useMemo(() => {
    return filteredPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [filteredPayouts]);

  const totalInvoiceSum = useMemo(() => {
    return filteredPayouts.reduce((acc, p) => acc + (p.invoiceAmount || 0), 0);
  }, [filteredPayouts]);

  const totalWithdrawalsSum = useMemo(() => {
    return filteredWithdrawals.reduce((acc, w) => acc + (w.amountUzs || 0), 0);
  }, [filteredWithdrawals]);

  // Keyboard shortcut listener for modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingReceipt(null);
        setDecisionModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const payoutsTableRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (payoutsTableRef.current) {
      payoutsTableRef.current.scrollLeft = 0;
    }
  }, [tab, payoutStatusFilter, payoutSearch]);

  const exportPayoutsCsv = () => {
    if (filteredPayouts.length === 0) {
      showToast("Eksport qilish uchun to'lovlar topilmadi", 'error');
      return;
    }
    const headers = [
      'ID',
      'Ish nomi',
      'Korxona',
      'Ishchi',
      'Ish haqi (UZS)',
      'Chek mavjudligi',
      'Hisob-faktura raqami',
      'Faktura summasi (UZS)',
      'Yuborilgan email',
      'Holat',
      'Sana'
    ];
    const rows = filteredPayouts.map(p => [
      p.id,
      `"${(p.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(p.company || '').replace(/"/g, '""')}"`,
      `"${(p.workerName || '').replace(/"/g, '""')}"`,
      p.amount,
      p.receiptUrl ? 'Mavjud' : 'Mavjud emas',
      p.invoiceNumber || '',
      p.invoiceAmount || 0,
      p.invoiceSentTo || '',
      p.invoiceConfirmedAt ? 'Tasdiqlangan' : p.invoicePaidDeclaredAt ? "To'lov e'lon qilingan" : p.invoiceSentAt ? "To'lov kutilmoqda" : 'Fakturasiz',
      p.paidAt ? when(p.paidAt) : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `baito_tolovlar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("To'lovlar CSV formatida muvaffaqiyatli yuklab olindi", 'success');
  };

  const exportWithdrawalsCsv = () => {
    if (filteredWithdrawals.length === 0) {
      showToast("Eksport qilish uchun so'rovlar topilmadi", 'error');
      return;
    }
    const headers = [
      'ID',
      'Foydalanuvchi',
      'Telefon',
      'Karta raqami',
      'Miqdor (UZS)',
      'Holat',
      'Bank referensi',
      'Sana'
    ];
    const rows = filteredWithdrawals.map(w => [
      w.id,
      `"${(w.userName || '').replace(/"/g, '""')}"`,
      `"${(w.userPhone || '').replace(/"/g, '""')}"`,
      `"${(w.bankCardMask || '').replace(/"/g, '""')}"`,
      w.amountUzs,
      w.status,
      w.reference || '',
      w.createdAt ? when(w.createdAt) : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `baito_yechishlar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Yechish so'rovlari CSV formatida muvaffaqiyatli yuklab olindi", 'success');
  };

  const hasBankConfigured = Boolean(bank.data?.payoutBankName && bank.data?.payoutBankAccount);

  return (
    <div className="space-y-4 pb-10">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Withdrawals */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kutilayotgan Yechishlar</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight">
              {money(pendingWithdrawalsTotal)}
            </div>
            <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{pendingWithdrawalsCount} ta so'rov navbatda</span>
            </div>
          </div>
        </div>

        {/* Card 2: Settled Wages */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To'langan Ish Haqlar</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight">
              {money(totalSettledAmount)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-1.5">
              <ArrowUpRight size={13} />
              <span>{payoutsList.length} ta to'lov operatsiyasi</span>
            </div>
          </div>
        </div>

        {/* Card 3: Invoices Status */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tasdiqlangan Fakturalar</span>
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-brand-primary tabular-nums tracking-tight">
              {confirmedCount} ta
            </div>
            <div className="text-[11px] font-semibold mt-1.5">
              {pendingConfirmCount > 0 ? (
                <span className="text-amber-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  {pendingConfirmCount} ta tasdiqlash kutilmoqda
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Bank ko'chirmasi tekshirilgan
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Bank Details */}
        <div 
          onClick={() => setTab('bank')}
          className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-brand-primary/50 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Baito Rekvizitlari</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <Landmark size={16} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {bank.data?.payoutBankName ? bank.data.payoutBankName : "Bank belgilanmagan"}
            </div>
            <div className="text-[11px] font-medium mt-1.5">
              {hasBankConfigured ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  H/R: {bank.data?.payoutBankAccount?.slice(0, 8)}... (Faol)
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1 hover:underline">
                  <AlertCircle size={13} />
                  Rekvizitlarni sozlash →
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl gap-1">
          {/* Tab 1: Payouts & Invoices */}
          <button
            type="button"
            onClick={() => setTab('payouts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'payouts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Receipt size={14} className={tab === 'payouts' ? 'text-brand-primary' : 'text-slate-400'} />
            <span>Ish haqi to'lovlari & Fakturalar</span>
            {pendingConfirmCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                {pendingConfirmCount} kutilmoqda
              </span>
            ) : payoutsList.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {payoutsList.length}
              </span>
            ) : null}
          </button>

          {/* Tab 2: Withdrawals */}
          <button
            type="button"
            onClick={() => setTab('withdrawals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'withdrawals'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wallet size={14} className={tab === 'withdrawals' ? 'text-amber-600' : 'text-slate-400'} />
            <span>{a.withdrawalRequests}</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          {/* Tab 3: Bank Details */}
          <button
            type="button"
            onClick={() => setTab('bank')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'bank'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Landmark size={14} className={tab === 'bank' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Bank rekvizitlari</span>
            {!hasBankConfigured && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
          title="Ma'lumotlarni yangilash"
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
            {/* Payouts Filter & Search Toolbar */}
            <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ish, korxona, ishchi yoki INV- raqami..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition shadow-2xs"
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

              {/* Status Filter Chips & Export */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/70">
                  {[
                    { id: 'all', label: 'Barchasi', count: payoutsList.length },
                    { id: 'pending_confirm', label: 'Tasdiqlash kutilmoqda', count: pendingConfirmCount, alert: true },
                    { id: 'invoiced', label: "To'lov kutilmoqda", count: payoutsList.filter(p => Boolean(p.invoiceSentAt && !p.invoicePaidDeclaredAt && !p.invoiceConfirmedAt)).length },
                    { id: 'confirmed', label: 'Tasdiqlangan', count: confirmedCount },
                    { id: 'no_invoice', label: 'Fakturasiz', count: payoutsList.filter(p => !p.invoiceSentAt).length },
                  ].map((item) => {
                    const isActive = payoutStatusFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPayoutStatusFilter(item.id as any)}
                        className={`h-7.5 px-2.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : item.alert && item.count > 0
                            ? 'text-amber-800 hover:text-amber-900'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {item.alert && item.count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        <span>{item.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-slate-100 text-slate-800'
                            : item.alert && item.count > 0
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={exportPayoutsCsv}
                  className="h-8.5 inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition cursor-pointer active:scale-95"
                  title="CSV jadvalini yuklab olish"
                >
                  <Download size={13} className="text-slate-500" />
                  <span>Eksport (CSV)</span>
                </button>
              </div>
            </div>

            {/* Payouts Table */}
            <div ref={payoutsTableRef} className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse table-fixed min-w-[860px]">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-semibold uppercase tracking-wider text-[11px] select-none">
                  <tr>
                    <th className="px-4 py-3">{a.jobLabel} va Korxona</th>
                    <th className="px-4 py-3">Ishchi va Ish haqi</th>
                    <th className="px-4 py-3">Hisob-faktura</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
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
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* 1. Job & Company */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-900 block text-xs truncate hover:text-brand-primary transition-colors" title={p.jobTitle || ''}>
                                {p.jobTitle ? p.jobTitle : '—'}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate mt-0.5">
                                <Building2 size={12} className="text-slate-400 shrink-0" />
                                <span className="font-medium text-slate-600 truncate">{p.company ? p.company : 'Baito hamkori'}</span>
                                {p.paidAt && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-slate-400 text-[10px] tabular-nums shrink-0">
                                      {new Date(p.paidAt).toLocaleDateString('uz-UZ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Worker & Wage */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {(p.workerName ? p.workerName.charAt(0) : 'I').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-slate-900 block text-xs truncate">
                                  {p.workerName ? p.workerName : '—'}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-bold text-slate-800 tabular-nums text-xs">
                                    {money(p.amount)}
                                  </span>
                                  {p.receiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceipt({
                                        url: p.receiptUrl,
                                        title: p.workerName ? `${p.workerName}ga to'lov cheki` : "Ish haqi cheki"
                                      })}
                                      className="text-[10px] font-semibold text-brand-primary hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                      title="Ishchi to'lov kvitansiyasini ko'rish"
                                    >
                                      <FileText size={10} /> Chek
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Invoice & Employer Payment */}
                          <td className="px-4 py-3.5 align-middle">
                            {p.invoiceSentAt ? (
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 tabular-nums text-xs">
                                    {money(p.invoiceAmount ?? 0)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-mono text-[10px] text-slate-500 font-medium">
                                    {p.invoiceNumber}
                                  </span>
                                  {p.invoicePaidReceiptUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceipt({
                                        url: p.invoicePaidReceiptUrl!,
                                        title: `Korxona to'lov kvitansiyasi (${p.invoiceNumber || 'INV'})`
                                      })}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/60 transition cursor-pointer"
                                      title="Korxona to'lov chekini ko'rish"
                                    >
                                      <Receipt size={9} className="text-indigo-600" />
                                      <span>Chek</span>
                                    </button>
                                  ) : isDeclaredPending ? (
                                    <span className="text-amber-700 font-medium text-[10px]">(Kvitansiyasiz)</span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium italic">— Fakturasiz</span>
                            )}
                          </td>

                          {/* 4. Payment Status */}
                          <td className="px-4 py-3.5 align-middle">
                            {isConfirmed ? (
                              <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200/70">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>Tasdiqlangan</span>
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {when(p.invoiceConfirmedAt)}
                                </span>
                              </div>
                            ) : isDeclaredPending ? (
                              <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>To'lov e'lon qilingan</span>
                                </span>
                                <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                                  Tasdiqlash kutilmoqda ({when(p.invoicePaidDeclaredAt)})
                                </span>
                              </div>
                            ) : isInvoiced ? (
                              <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  <span>To'lov kutilmoqda</span>
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Faktura yuborilgan
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">— Fakturasiz</span>
                            )}
                          </td>

                          {/* 5. Admin Actions */}
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isDeclaredPending && (
                                <button
                                  type="button"
                                  onClick={() => setReconcileModal(p)}
                                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0"
                                  title="Bank ko'chirmasi bilan solishtirish va tasdiqlash"
                                >
                                  <CheckCircle size={13} />
                                  <span>To'lovni tasdiqlash</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setAuditDetailModal(p)}
                                className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs transition-all cursor-pointer shadow-2xs shrink-0"
                                title="To'lov audit jurnalini ko'rish"
                              >
                                <Eye size={12} className="text-slate-400" />
                                <span>{isDeclaredPending ? 'Audit' : "Audit ko'rish"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Totals */}
                {filteredPayouts.length > 0 && (
                  <tfoot className="bg-slate-50/80 border-t border-slate-200/80 text-xs font-semibold text-slate-600">
                    <tr>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 font-medium">Jami:</span> {filteredPayouts.length} ta operatsiya
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-slate-400 font-medium">Jami ish haqi:</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums">{money(totalWageSum)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-slate-400 font-medium">Jami faktura:</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums">{money(totalInvoiceSum)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {pendingConfirmCount > 0 ? (
                          <span className="text-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {pendingConfirmCount} ta tasdiqlash kutilmoqda
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-bold">
                            Barchasi tasdiqlangan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 font-mono">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Table Bottom Navigation & Summary Bar */}
            <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="font-medium">
                Ko'rsatilmoqda: <strong className="text-slate-800 font-bold">{filteredPayouts.length}</strong> ta to'lov (jami {payoutsList.length} tadan)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {pendingConfirmCount > 0 ? `⚡ ${pendingConfirmCount} ta faktura admin tasdig'ini kutmoqda` : 'Barcha to\'lovlar solishtirilgan'}
              </span>
            </div>
          </div>
        ) : tab === 'withdrawals' ? (
          <div>
            {/* Withdrawals Filter Bar */}
            <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ishchi ismi, telefon yoki karta raqami..."
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
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

              {/* Status Tabs & Export */}
              <div className="flex items-center gap-2 flex-wrap">
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

                <button
                  type="button"
                  onClick={exportWithdrawalsCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="Yechish so'rovlarini CSV faylga yuklash"
                >
                  <Download size={13} className="text-slate-500" />
                  <span>Eksport (CSV)</span>
                </button>
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[200px]">{a.roleWorker}</th>
                    <th className="px-4 py-3.5 min-w-[170px]">Bank Kartasi</th>
                    <th className="px-4 py-3.5 min-w-[140px]">So'ralgan Summa</th>
                    <th className="px-4 py-3.5 min-w-[140px]">{a.dateLabel}</th>
                    <th className="px-4 py-3.5 text-right min-w-[180px]">Holat & Qaror</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
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
                        <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                                {(w.userName ? w.userName.charAt(0) : 'U').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block text-xs truncate">
                                  {w.userName ? w.userName : 'Foydalanuvchi'}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                                  {w.userPhone ? w.userPhone : '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-slate-800 font-semibold text-xs border border-slate-200/80">
                              <CreditCard size={13} className="text-slate-400 shrink-0" />
                              <span>{w.bankCardMask ? w.bankCardMask : 'Karta biriktirilgan'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle font-black text-slate-900 tabular-nums text-sm">
                            {money(w.amountUzs)}
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-500 font-medium">
                            <span className="font-semibold text-slate-800 text-xs block tabular-nums">
                              {w.createdAt ? new Date(w.createdAt).toLocaleDateString('uz-UZ') : '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {w.createdAt ? new Date(w.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busyId === w.id}
                                  onClick={() => handleOpenDecision(w, 'approve')}
                                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50 active:scale-95"
                                >
                                  {busyId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                  <span>Tasdiqlash</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === w.id}
                                  onClick={() => handleOpenDecision(w, 'reject')}
                                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer hover:bg-rose-100 transition disabled:opacity-50 active:scale-95 shadow-2xs"
                                >
                                  <X size={13} />
                                  <span>Rad etish</span>
                                </button>
                              </div>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/80">
                                <CheckCircle size={12} className="text-emerald-600" />
                                <span>O'tkazilgan{w.reference ? ` · Ref: ${w.reference}` : ''}</span>
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200/80">
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

                {/* Withdrawals Footer Totals */}
                {filteredWithdrawals.length > 0 && (
                  <tfoot className="bg-slate-50/80 border-t border-slate-200/80 text-xs text-slate-600 font-bold">
                    <tr>
                      <td className="px-4 py-3">
                        Jami ({filteredWithdrawals.length} ta so'rov)
                      </td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-slate-900 font-black tabular-nums text-sm">
                        {money(totalWithdrawalsSum)}
                      </td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-right text-slate-400 font-medium">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Withdrawals Bottom Navigation */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span className="font-medium">
                Ko'rsatilmoqda: <strong className="text-slate-800 font-bold">{filteredWithdrawals.length}</strong> ta so'rov (jami {rawWithdrawals.length} tadan)
              </span>
              <button
                type="button"
                onClick={exportWithdrawalsCsv}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer hover:underline"
              >
                <Download size={12} /> CSV yuklab olish
              </button>
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
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Faylni yuklab olish"
                >
                  <Download size={16} />
                </a>
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

      {/* Bank Reconciliation Modal */}
      {reconcileModal && (
        <ReconciliationModal
          payout={reconcileModal}
          bank={bank.data}
          onClose={() => setReconcileModal(null)}
          onConfirm={(jobId) => confirmPayment.mutate(jobId)}
          isConfirming={confirmPayment.isPending}
          onViewReceipt={(url, title) => setViewingReceipt({ url, title })}
        />
      )}

      {/* Payout Audit Detail Modal */}
      {auditDetailModal && (
        <AuditDetailModal
          payout={auditDetailModal}
          onClose={() => setAuditDetailModal(null)}
          onViewReceipt={(url, title) => setViewingReceipt({ url, title })}
        />
      )}
    </div>
  );
};

const ReconciliationModal: React.FC<{
  payout: JobPayout;
  bank?: BankDetails;
  onClose: () => void;
  onConfirm: (jobId: string) => void;
  isConfirming: boolean;
  onViewReceipt: (url: string, title: string) => void;
}> = ({ payout, bank, onClose, onConfirm, isConfirming, onViewReceipt }) => {
  const [statementChecked, setStatementChecked] = useState(false);
  const companyName = payout.company ? payout.company : 'Baito hamkori';
  const jobTitle = payout.jobTitle ? payout.jobTitle : 'Buyurtma';
  const expectedAmount = payout.invoiceAmount ?? payout.amount;
  const hasReceipt = Boolean(payout.invoicePaidReceiptUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Bank to'lovini solishtirish va tasdiqlash</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Hisob-faktura: <span className="font-mono font-semibold text-slate-700">{payout.invoiceNumber || '—'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Buyurtmachi korxona</span>
              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                <Building2 size={13} className="text-slate-500" />
                {companyName}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">{jobTitle}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">Kutilayotgan summa</span>
              <span className="font-black text-slate-900 text-base tabular-nums mt-0.5 block text-indigo-950">
                {money(expectedAmount)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                E'lon vaqti: {when(payout.invoicePaidDeclaredAt)}
              </span>
            </div>
          </div>

          {/* Payment Reference & Method */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200/70 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">To'lov usuli / Bank ma'lumotnomasi</span>
              <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                {payout.invoicePaidReference ? `Ref #${payout.invoicePaidReference}` : "Bank o'tkazmasi (kvitansiyasiz)"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold block text-[11px]">Hisob-faktura yuborilgan</span>
              <span className="text-slate-700 font-medium text-[11px]">
                {payout.invoiceSentTo ? payout.invoiceSentTo : 'Email ko\'rsatilmagan'}
              </span>
            </div>
          </div>

          {/* Baito Bank Account Info */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-indigo-950 font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <Landmark size={14} className="text-indigo-600" />
                Baito Rasmiy Bank Rekvizitlari (Qabul qiluvchi)
              </span>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-extrabold">
                {bank?.payoutBankMfo ? `MFO: ${bank.payoutBankMfo}` : 'MFO: 00873'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Bank nomi:</span>
                <span className="font-semibold text-slate-800">{bank?.payoutBankName ? bank.payoutBankName : 'Ipoteka Bank ATIB'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hisob-kitob raqami (H/R):</span>
                <span className="font-mono font-bold text-slate-900">{bank?.payoutBankAccount ? bank.payoutBankAccount : '20208000900000000001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tashkilot STIR / INN:</span>
                <span className="font-mono font-semibold text-slate-800">{bank?.payoutCompanyInn ? bank.payoutCompanyInn : '123456789'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Korxona:</span>
                <span className="font-semibold text-slate-800">{bank?.payoutCompanyName ? bank.payoutCompanyName : 'Baito MChJ'}</span>
              </div>
            </div>
          </div>

          {/* Employer Payment Receipt Inspection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-xs block">
              Korxona taqdim etgan to'lov hujjati (Chek):
            </label>
            {hasReceipt ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    <img
                      src={payout.invoicePaidReceiptUrl!}
                      alt="Bank cheki"
                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                      onClick={() => onViewReceipt(payout.invoicePaidReceiptUrl!, `Bank kvitansiyasi (${payout.invoiceNumber || 'INV'})`)}
                    />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      To'lov kvitansiyasi biriktirilgan
                    </span>
                    <span className="text-[11px] text-emerald-800 block mt-0.5">
                      Faylni ko'rib, bank shtampi, summa va sana to'g'riligini tekshiring.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewReceipt(payout.invoicePaidReceiptUrl!, `Bank kvitansiyasi (${payout.invoiceNumber || 'INV'})`)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Eye size={12} />
                    <span>Ko'rish</span>
                  </button>
                  <a
                    href={payout.invoicePaidReceiptUrl!}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition shadow-2xs"
                    title="Yuklab olish"
                  >
                    <Download size={13} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>Korxona tomonidan to'lov cheki yuklanmagan!</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Ish beruvchi faktura to'langanligini e'lon qilgan, ammo bank kvitansiyasi yuklanmagan.
                  Admin sifatida bank ko'chirmangizni (Bank-Mijoz / Vyipiska) ochib, ushbu summa (<strong className="font-black text-amber-950">{money(expectedAmount)}</strong>)
                  Baito hisobiga kelib tushganini shaxsan tekshirishingiz zarur.
                </p>
              </div>
            )}
          </div>

          {/* Admin Statement Verification Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-brand-primary/50 transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={statementChecked}
                onChange={(e) => setStatementChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-brand-primary border-slate-300 focus:ring-brand-primary/20 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 leading-snug">
                Men Baito bank hisobiga (Bank-Mijoz / vyipiska orqali) ushbu to'lov (<span className="text-emerald-700 font-black">{money(expectedAmount)}</span>)
                to'liq kelib tushganini tekshirdim va to'lovni tasdiqlayman.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Bekor qilish
          </button>

          <button
            type="button"
            onClick={() => onConfirm(payout.jobId)}
            disabled={!statementChecked || isConfirming}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isConfirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            <span>To'lovni tasdiqlash</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditDetailModal: React.FC<{
  payout: JobPayout;
  onClose: () => void;
  onViewReceipt: (url: string, title: string) => void;
}> = ({ payout, onClose, onViewReceipt }) => {
  const companyName = payout.company ? payout.company : 'Baito hamkori';
  const workerName = payout.workerName ? payout.workerName : 'Ishchi';
  const jobTitle = payout.jobTitle ? payout.jobTitle : 'Buyurtma';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
              <FileCheck size={17} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">To'lov va Faktura Auditi</h4>
              <p className="text-[10px] text-slate-500 font-mono">Job #{payout.jobId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Buyurtma */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Buyurtma va Taraflar</span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ish nomi:</span>
              <span className="font-bold text-slate-900">{jobTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Korxona:</span>
              <span className="font-bold text-slate-900">{companyName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ishchi:</span>
              <span className="font-bold text-slate-900">{workerName}</span>
            </div>
          </div>

          {/* Section 2: Ishchi To'lovi */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">1. Ishchiga To'langan Ish Haqi</span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Summa:</span>
              <span className="font-black text-slate-900 tabular-nums">{money(payout.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">To'langan vaqt:</span>
              <span className="text-slate-700 font-medium">{when(payout.paidAt)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Ishchi kvitansiyasi:</span>
              {payout.receiptUrl ? (
                <button
                  type="button"
                  onClick={() => onViewReceipt(payout.receiptUrl, `${workerName}ga to'lov cheki`)}
                  className="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  <Eye size={12} /> Chekni ko'rish
                </button>
              ) : (
                <span className="text-slate-400 italic">Mavjud emas</span>
              )}
            </div>
          </div>

          {/* Section 3: Korxona Hisob-Fakturasi */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">2. Korxonaga Hisob-Faktura</span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Faktura raqami:</span>
              <span className="font-mono font-bold text-slate-800">{payout.invoiceNumber || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Faktura summasi:</span>
              <span className="font-black text-slate-900 tabular-nums">{money(payout.invoiceAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Yuborilgan email:</span>
              <span className="text-slate-700">{payout.invoiceSentTo || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Yuborilgan sana:</span>
              <span className="text-slate-700">{when(payout.invoiceSentAt)}</span>
            </div>
          </div>

          {/* Section 4: Korxona Tushumi va Cheki */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">3. Korxona Bank To'lovi va Cheki</span>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">To'lov e'lon qilingan vaqt:</span>
              <span className="text-slate-700">{when(payout.invoicePaidDeclaredAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Bank tranzaksiya referensi:</span>
              <span className="font-mono text-slate-800 font-semibold">{payout.invoicePaidReference || '—'}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Korxona bank cheki:</span>
              {payout.invoicePaidReceiptUrl ? (
                <button
                  type="button"
                  onClick={() => onViewReceipt(payout.invoicePaidReceiptUrl!, `Bank kvitansiyasi (${payout.invoiceNumber || 'INV'})`)}
                  className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  <Eye size={12} /> Korxona chekini ko'rish
                </button>
              ) : (
                <span className="text-amber-700 font-medium">⚠️ Chek yuklanmagan</span>
              )}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Admin tasdiqlagan vaqt:</span>
              <span className="font-bold text-emerald-700">{payout.invoiceConfirmedAt ? when(payout.invoiceConfirmedAt) : 'Tasdiqlanmagan'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
          >
            Yopish
          </button>
        </div>
      </div>
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
            <div className="relative">
              <input
                type="text"
                value={form[k] ?? ''}
                onChange={set(k)}
                placeholder={placeholder}
                className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
                style={{ outline: 'none' }}
              />
              {Boolean(form[k]) && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(form[k] || '');
                    showToast(`${label} nusxalandi`, 'success');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Nusxalash"
                >
                  <Copy size={13} />
                </button>
              )}
            </div>
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
