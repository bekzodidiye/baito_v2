import React, { useState, useMemo } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/client';
import { showToast } from '../../utils/toast';
import { AdminTransaction } from './types';
import {
  DollarSign, ArrowUpRight, ArrowDownLeft, AlertCircle, Wallet,
  CreditCard, CheckCircle2, Clock, XCircle, Search, Copy, Check,
  TrendingUp, FileSpreadsheet, ArrowLeftRight, PieChart, ShieldCheck,
  Download, RefreshCw, X, Loader2
} from 'lucide-react';
import { PortalSelect } from './AdminCustomControls';

interface AdminTransactionsProps {
  onRefresh?: () => void;
  transactions: AdminTransaction[];
}

export const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions, onRefresh }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [activeTab, setActiveTab] = useState<'tx' | 'withdrawals' | 'commission'>('tx');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'payout' | 'withdraw' | 'refund'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'canceled'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Decision Modal for pending withdrawal requests
  const [decisionModal, setDecisionModal] = useState<{
    txId: string;
    userName: string;
    amount: string | number;
    action: 'approve' | 'reject';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [bankReference, setBankReference] = useState('');

  const formatSum = (val?: string | number) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return num.toLocaleString('uz-UZ') + ' UZS';
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const locale = ({ ru: 'ru-RU', en: 'en-US', uz: 'uz-UZ' } as Record<string, string>)[language] || 'uz-UZ';
      return d.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Withdrawals list (backend uses 'withdraw')
  const withdrawals = useMemo(() => {
    return transactions
      .filter(t => t.type === 'withdraw' || t.type === 'withdrawal')
      .map(w => ({
        id: w.id,
        workerName: w.workerName || w.employerName || 'Foydalanuvchi',
        cardNumber: 'Bank kartasi',
        amount: w.amount,
        requestedAt: w.createdAt || '',
        status: w.status as 'pending' | 'paid' | 'released' | 'approved' | 'canceled' | 'rejected',
        isDelayed: false,
      }));
  }, [transactions]);

  const settledFees = transactions.filter((t) => t.status === 'paid' || t.status === 'released');
  const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
  const isThisMonth = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const sumFees = (rows: AdminTransaction[]) => rows.reduce((acc, t) => acc + (Number(t.platformFee) || 0), 0);
  const todayCommission = sumFees(settledFees.filter((t) => isToday(t.createdAt)));
  const monthCommission = sumFees(settledFees.filter((t) => isThisMonth(t.createdAt)));
  const settledAmount = settledFees.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const settledFeeTotal = sumFees(settledFees);
  const avgCommissionRate = settledAmount > 0 ? (settledFeeTotal / settledAmount) * 100 : 0;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;

  // Filtered transactions for Tab 1
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'withdraw') {
          if (tx.type !== 'withdraw' && tx.type !== 'withdrawal') return false;
        } else if (tx.type !== typeFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid') {
          if (tx.status !== 'paid' && tx.status !== 'released') return false;
        } else if (statusFilter === 'canceled') {
          if (tx.status !== 'canceled' && tx.status !== 'rejected') return false;
        } else if (tx.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = tx.id.toLowerCase().includes(q);
        const matchesWorker = tx.workerName?.toLowerCase().includes(q);
        const matchesEmployer = tx.employerName?.toLowerCase().includes(q);
        const matchesAmount = String(tx.amount).includes(q);
        if (!matchesId && !matchesWorker && !matchesEmployer && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, search]);

  const totalAmountSum = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFeeSum = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (Number(t.platformFee) || 0), 0);
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('Eksport qilish uchun tranzaksiyalar mavjud emas', 'error');
      return;
    }

    const headers = ['ID', 'Turi', 'Ishtirokchi', 'Summa (UZS)', 'Komissiya (UZS)', 'Holat', 'Sana'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.type === 'deposit' ? 'Depozit' : tx.type === 'payout' ? "Ishchiga to'lov" : tx.type === 'withdraw' ? 'Pul yechish' : tx.type,
      `"${(tx.workerName || tx.employerName || '—').replace(/"/g, '""')}"`,
      tx.amount,
      tx.platformFee || 0,
      tx.status,
      tx.createdAt || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `baito_tranzaksiyalar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tranzaksiyalar CSV faylga yuklab olindi', 'success');
  };

  const handleExecuteDecision = async () => {
    if (!decisionModal) return;
    const { txId, action } = decisionModal;

    if (!decisionReason || decisionReason.trim().length < 3) {
      showToast("Iltimos, sababni kiriting (kamida 3 belgi)", 'error');
      return;
    }

    setBusyId(txId);
    try {
      await apiClient(`/admin/withdrawals/${txId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reason: decisionReason.trim(),
          reference: action === 'approve' && bankReference.trim() ? bankReference.trim() : null,
        }),
      });
      showToast(action === 'approve' ? 'Yechish tasdiqlandi' : 'Rad etildi, mablag\' qaytarildi', 'success');
      setDecisionModal(null);
      onRefresh?.();
    } catch (e: any) {
      showToast(e?.message || 'Amal bajarilmadi', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Financial Health Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jami aylanma</span>
            <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{formatSum(settledAmount)}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Platformadagi barcha amallar</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Komissiya zaxirasi</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart size={15} />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-indigo-600 tabular-nums">{formatSum(settledFeeTotal)}</div>
          <div className="text-[11px] font-bold text-indigo-600 mt-1">Platforma daromadi</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Kutilayotgan yechishlar</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={15} />
            </div>
          </div>
          <div className="text-lg font-black text-amber-600 tabular-nums">{pendingWithdrawalsCount} ta so'rov</div>
          <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Navbatdagi arizalar
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">{a.averageCommission}</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-600 tabular-nums">{avgCommissionRate.toFixed(1)}%</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1">O'rtacha stavka</div>
        </div>
      </div>

      {/* Tabs and Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'tx', label: 'Tranzaksiyalar (Ledger)', icon: ArrowLeftRight, count: transactions.length },
            { id: 'withdrawals', label: "Chiqarish So'rovlari", icon: Wallet, badge: pendingWithdrawalsCount > 0 ? String(pendingWithdrawalsCount) : undefined },
            { id: 'commission', label: 'Komissiya Hisoboti', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-brand-primary' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'tx' && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="CSV yuklab olish"
            >
              <Download size={14} className="text-slate-500" />
              <span>CSV Eksport</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Yangilash"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Ledger Table */}
      {activeTab === 'tx' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          {/* Search & Filter Toolbar */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ID, ishtirokchi yoki summa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/10 transition-all shadow-2xs"
                style={{ outline: 'none' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Type & Status Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Select */}
              <PortalSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as any)}
                options={[
                  { value: 'all', label: 'Barcha turlar' },
                  { value: 'deposit', label: 'Depozitlar', dot: 'bg-emerald-500' },
                  { value: 'payout', label: "Ishchiga to'lov", dot: 'bg-brand-primary' },
                  { value: 'withdraw', label: 'Pul yechish', dot: 'bg-amber-500' },
                  { value: 'refund', label: 'Qaytarish (Refund)', dot: 'bg-purple-500' },
                ]}
              />

              {/* Status Select */}
              <PortalSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: 'Barcha holatlar' },
                  { value: 'paid', label: 'Muvaffaqiyatli', dot: 'bg-emerald-500' },
                  { value: 'pending', label: 'Kutilmoqda', dot: 'bg-amber-500' },
                  { value: 'canceled', label: 'Bekor qilingan', dot: 'bg-rose-500' },
                ]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                <tr>
                  <th className="p-4 pl-5 uppercase tracking-wider text-[11px] min-w-[200px]">Operatsiya Turi</th>
                  <th className="p-4 uppercase tracking-wider text-[11px] min-w-[130px]">Miqdor</th>
                  <th className="p-4 uppercase tracking-wider text-[11px] min-w-[110px]">Komissiya</th>
                  <th className="p-4 uppercase tracking-wider text-[11px] min-w-[130px]">Sana</th>
                  <th className="p-4 uppercase tracking-wider text-[11px] min-w-[120px]">Holat</th>
                  <th className="p-4 pr-5 text-right uppercase tracking-wider text-[11px] min-w-[110px]">Tranzaksiya ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 font-bold">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <DollarSign size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Tranzaksiyalar mavjud emas</p>
                      <p className="text-xs text-slate-400 font-normal mt-0.5">Filtrni tozalab qayta urinib ko'ring</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    const isPayout = tx.type === 'payout';
                    const isWithdraw = tx.type === 'withdraw' || tx.type === 'withdrawal';
                    const isRefund = tx.type === 'refund';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/90 transition-colors group">
                        {/* Type & Party */}
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              isDeposit
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                : isPayout
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : isWithdraw
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {isDeposit ? (
                                <ArrowDownLeft size={16} />
                              ) : isPayout ? (
                                <ArrowUpRight size={16} />
                              ) : isWithdraw ? (
                                <Wallet size={15} />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {isDeposit
                                  ? "Depozit (Muzlatilgan)"
                                  : isPayout
                                  ? "Ishchiga To'lov (Ish haqi)"
                                  : isWithdraw
                                  ? "Pul Yechish (Karta)"
                                  : "Mablag' Qaytarish"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {tx.workerName || tx.employerName || 'Platforma orqali'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-4 font-black font-mono tabular-nums text-sm">
                          <span className={isDeposit ? 'text-emerald-700' : 'text-slate-900'}>
                            {isDeposit ? '+ ' : ''}{formatSum(tx.amount)}
                          </span>
                        </td>

                        {/* Fee */}
                        <td className="p-4 font-bold font-mono text-indigo-600 tabular-nums">
                          {tx.platformFee ? formatSum(tx.platformFee) : '—'}
                        </td>

                        {/* Date */}
                        <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                            tx.status === 'paid' || tx.status === 'released'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === 'paid' || tx.status === 'released' ? 'bg-emerald-500' : tx.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                            }`} />
                            <span>{tx.status}</span>
                          </span>
                        </td>

                        {/* Transaction ID Copy */}
                        <td className="p-4 pr-5 text-right font-mono text-xs">
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.id, tx.id)}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-800 font-semibold cursor-pointer group/copy px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                            title="ID nusxalash"
                          >
                            <span>{tx.id.slice(0, 8)}...</span>
                            {copiedId === tx.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} className="opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t border-slate-200/80 text-xs font-bold text-slate-700">
                  <tr>
                    <td className="p-4 pl-5">
                      Jami ({filteredTransactions.length} ta operatsiya)
                    </td>
                    <td className="p-4 font-mono font-black tabular-nums text-sm text-slate-900">
                      {formatSum(totalAmountSum)}
                    </td>
                    <td className="p-4 font-mono font-bold tabular-nums text-indigo-600">
                      {formatSum(totalFeeSum)}
                    </td>
                    <td className="p-4">—</td>
                    <td className="p-4">—</td>
                    <td className="p-4 pr-5 text-right font-medium text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Table Bottom Navigation & Summary Bar */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-medium">
              Ko'rsatilmoqda: <strong className="text-slate-800 font-bold">{filteredTransactions.length}</strong> ta tranzaksiya (jami {transactions.length} tadan)
            </span>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer hover:underline"
            >
              <Download size={12} /> CSV yuklab olish
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Withdrawals Table */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black">
                <tr>
                  <th className="p-4 pl-5 uppercase tracking-wider text-[11px]">{a.roleWorker}</th>
                  <th className="p-4 uppercase tracking-wider text-[11px]">Karta</th>
                  <th className="p-4 uppercase tracking-wider text-[11px]">Summa</th>
                  <th className="p-4 uppercase tracking-wider text-[11px]">{a.requestedDate}</th>
                  <th className="p-4 uppercase tracking-wider text-[11px]">Holat</th>
                  <th className="p-4 pr-5 text-right uppercase tracking-wider text-[11px]">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 font-bold">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Wallet size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Pul yechish so'rovlari yo'q</p>
                      <p className="text-xs text-slate-400 font-normal mt-0.5">Ishchilar tomonidan chiqarish so'rovlari kelib tushganda bu yerda ko'rinadi</p>
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => {
                    const isPending = w.status === 'pending';
                    const isApproved = w.status === 'paid' || w.status === 'released' || w.status === 'approved';
                    const isRejected = w.status === 'canceled' || w.status === 'rejected';

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="p-4 pl-5 font-bold text-slate-900">{w.workerName}</td>
                        <td className="p-4 font-mono text-slate-600 flex items-center gap-1.5">
                          <CreditCard size={14} className="text-slate-400 shrink-0" />
                          <span>{w.cardNumber}</span>
                        </td>
                        <td className="p-4 font-black font-mono text-slate-900 tabular-nums text-sm">
                          {formatSum(w.amount)}
                        </td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">{formatDate(w.requestedAt)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 font-black text-[10px] rounded-full uppercase tracking-wider border ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 pr-5 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busyId === w.id}
                                onClick={() => {
                                  setDecisionReason('');
                                  setBankReference('');
                                  setDecisionModal({ txId: w.id, userName: w.workerName, amount: w.amount, action: 'approve' });
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                              >
                                O'tkazish
                              </button>
                              <button
                                type="button"
                                disabled={busyId === w.id}
                                onClick={() => {
                                  setDecisionReason('');
                                  setBankReference('');
                                  setDecisionModal({ txId: w.id, userName: w.workerName, amount: w.amount, action: 'reject' });
                                }}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 font-bold rounded-xl border border-rose-200 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                              >
                                Rad Etish
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {withdrawals.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t border-slate-200/80 text-xs font-bold text-slate-700">
                  <tr>
                    <td className="p-4 pl-5">
                      Jami ({withdrawals.length} ta so'rov)
                    </td>
                    <td className="p-4">—</td>
                    <td className="p-4 font-mono font-black tabular-nums text-sm text-slate-900">
                      {formatSum(withdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0))}
                    </td>
                    <td className="p-4">—</td>
                    <td className="p-4">—</td>
                    <td className="p-4 pr-5 text-right font-medium text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Commission Reports */}
      {activeTab === 'commission' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bugungi Komissiya</span>
              <div className="text-2xl font-black font-mono text-indigo-600 mt-2">{formatSum(todayCommission)}</div>
              <p className="text-xs text-slate-400 mt-1">Bugun platforma hisobiga tushgan sof xizmat haqi</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Oylik Jami Komissiya</span>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-2">{formatSum(monthCommission)}</div>
              <p className="text-xs text-slate-400 mt-1">Joriy oy bo'yicha hisoblangan jami komissiyalar</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{a.averageCommission}</span>
              <div className="text-2xl font-black text-slate-900 mt-2">{avgCommissionRate.toFixed(1)}%</div>
              <p className="text-xs text-slate-400 mt-1">Bajarilgan shartnomalarga nisbatan o'rtacha foiz stavkasi</p>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <h4 className="font-black text-slate-900 text-sm mb-4">Moliyaviy Oqim Taqsimoti</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500">Muzlatilgan Depozitlar:</span>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatSum(transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + (Number(t.amount) || 0), 0))}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500">Ishchilarga To'langan:</span>
                <p className="text-base font-black text-emerald-700 mt-1">
                  {formatSum(transactions.filter(t => t.type === 'payout').reduce((s, t) => s + (Number(t.amount) || 0), 0))}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500">Yechib Olingan (Kartalar):</span>
                <p className="text-base font-black text-amber-700 mt-1">
                  {formatSum(withdrawals.filter(w => w.status === 'paid' || w.status === 'released').reduce((s, w) => s + (Number(w.amount) || 0), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-5 ${decisionModal.action === 'approve' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-rose-50 border-b border-rose-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    decisionModal.action === 'approve' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}>
                    {decisionModal.action === 'approve' ? <Check size={18} /> : <X size={18} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {decisionModal.action === 'approve' ? "Pul Yechishni Tasdiqlash" : "Yechishni Rad Etish"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Foydalanuvchi: {decisionModal.userName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Summa:</span>
                  <span className="font-black text-slate-900 text-sm tabular-nums">
                    {formatSum(decisionModal.amount)}
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
                    placeholder="Masalan: PAYME-12345678"
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
                  disabled={busyId === decisionModal.txId || !decisionReason.trim()}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-white text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95 ${
                    decisionModal.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {busyId === decisionModal.txId ? (
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
    </div>
  );
};
