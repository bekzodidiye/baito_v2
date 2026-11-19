import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/client';
import { AdminUserDetailResponse, AdminUserInvoice, AdminUserTransaction } from './types';
import {
  PlusCircle,
  Wallet,
  History,
  AlertCircle,
  FileText,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCheck,
  Briefcase,
} from 'lucide-react';

interface UserTabsExtraProps {
  detail: AdminUserDetailResponse;
  activeTab: number;
  onAddBalance: (userId: string, amount: number, reason: string) => void;
}

export const UserTabsExtra: React.FC<UserTabsExtraProps> = ({ detail, activeTab, onAddBalance }) => {
  const language = useAuthStore((st) => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const user = detail?.user || { id: '', name: 'Foydalanuvchi', role: 'worker', balance: 0, adminNotes: [] };
  const sessions = detail?.sessions || [];
  const transactions: AdminUserTransaction[] = detail?.transactions || [];
  const orders = detail?.orders || [];
  const reviews = detail?.reviews || [];
  const invoices: AdminUserInvoice[] = detail?.invoices || [];

  const [notes, setNotes] = useState<{ text: string; date: string }[]>(user?.adminNotes || []);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [financeFilter, setFinanceFilter] = useState<'all' | 'invoices' | 'transactions' | 'income' | 'payout'>('all');

  // Sync notes when detail changes
  React.useEffect(() => {
    if (user?.adminNotes) {
      setNotes(user.adminNotes);
    }
  }, [user?.adminNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting || !user?.id) return;

    setIsSubmitting(true);
    try {
      const data = await apiClient(`/admin/users/${user.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: newNote.trim() }),
      });
      if (data.success) {
        setNotes(data.notes);
        setNewNote('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
      case 'payment_confirmed':
      case 'credited':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <CheckCircle size={10} /> {status === 'payment_confirmed' ? 'Tasdiqlangan' : 'Muvaffaqiyatli'}
          </span>
        );
      case 'payment_declared':
        return (
          <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <Clock size={10} /> To'lov bildirildi
          </span>
        );
      case 'active':
        return (
          <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <Clock size={10} /> Faol
          </span>
        );
      case 'cancelled':
      case 'canceled':
      case 'failed':
        return (
          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/80 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <XCircle size={10} /> {a.cancelledLabel}
          </span>
        );
      case 'invoiced':
      case 'pending':
      default:
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <Clock size={10} /> {status === 'invoiced' ? 'Invois yuborilgan' : 'Kutilmoqda'}
          </span>
        );
    }
  };

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    return parseFloat(val).toLocaleString('uz-UZ');
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return isNaN(d.getTime())
      ? isoStr
      : d.toLocaleString('uz-UZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // Tab 3: Orders & Jobs
  if (activeTab === 3) {
    return (
      <div className="space-y-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <History size={13} />
              </div>
              Buyurtmalar va Ishlar Tarixi
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
              {orders.length} ta
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/40 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-4 font-bold">{a.dateLabel}</th>
                  <th className="p-3.5 font-bold">{a.clientOrWorker}</th>
                  <th className="p-3.5 font-bold">Summa</th>
                  <th className="p-3.5 pr-4 font-bold">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs text-slate-400 font-medium">
                      {a.noOrders}
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {o.date ? formatDate(o.date) : '—'}
                      </td>
                      <td className="p-3.5 text-xs font-bold text-slate-900 truncate max-w-[150px]">
                        {o.employerName || '—'}
                      </td>
                      <td className="p-3.5 text-xs font-black text-emerald-600 whitespace-nowrap">
                        {formatCurrency(o.amount)} <span className="text-[10px] text-slate-500 font-bold">UZS</span>
                      </td>
                      <td className="p-3.5 pr-4 whitespace-nowrap">{getStatusBadge(o.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Tab 4: Finance (3 Bento Cards: Joriy Balans, Qilingan to'lovlar, To'lov kutilmoqda)
  // Tab 4: Finance (3 Bento Cards: Joriy Balans / Faol E'lonlar, Jami Ishlangan / Qilingan To'lovlar, Yechib Olingan / To'lov Kutilmoqda)
  if (activeTab === 4) {
    const isEmployer = user.role === 'employer';

    // --- Employer financial metrics ---
    const confirmedInvoicesSum = invoices
      .filter((i) => i.status === 'payment_confirmed' || i.status === 'paid')
      .reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0);

    const successfulTxsSum = transactions
      .filter(
        (t) =>
          (t.type === 'deposit' || t.type === 'income' || t.type === 'payment') &&
          (t.status === 'success' || t.status === 'paid' || t.status === 'completed')
      )
      .reduce((sum, t) => sum + (parseFloat(t.amount as any) || 0), 0);

    const totalPaidToUs = confirmedInvoicesSum + successfulTxsSum;

    const pendingInvoicesSum = invoices
      .filter((i) => i.status === 'invoiced' || i.status === 'payment_declared')
      .reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0);

    const pendingTxsSum = transactions
      .filter((t) => t.status === 'pending' || t.status === 'kutilmoqda')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount as any) || 0), 0);

    const totalPendingOwed = pendingInvoicesSum + pendingTxsSum;

    const activeJobs = orders.filter(
      (o) =>
        o.status !== 'completed' &&
        o.status !== 'finished' &&
        o.status !== 'cancelled' &&
        o.status !== 'canceled' &&
        o.status !== 'rejected'
    );
    const activeJobsTotal = activeJobs.reduce(
      (sum, o) => sum + (parseFloat(o.amount as any) || 0),
      0
    );

    // --- Worker financial metrics ---
    // 1) Jami Ishlangan (Total worker earnings from completed jobs & bonuses)
    const workerEarnedTxs = transactions
      .filter(
        (t) =>
          (t.type === 'worker_earning' ||
            t.type === 'completion_bonus' ||
            t.type === 'income') &&
          (t.status === 'credited' ||
            t.status === 'paid' ||
            t.status === 'success' ||
            t.status === 'completed')
      )
      .reduce((sum, t) => sum + (parseFloat(t.amount as any) || 0), 0);

    const completedOrders = orders.filter(
      (o) => o.status === 'completed' || o.status === 'finished'
    );
    const completedOrdersTotal = completedOrders.reduce(
      (sum, o) => sum + (parseFloat(o.amount as any) || 0),
      0
    );

    const workerTotalEarned = Math.max(workerEarnedTxs, completedOrdersTotal);

    // 2) Yechib Olingan (Total paid out / withdrawn by worker)
    const workerPaidOut = transactions
      .filter(
        (t) =>
          (t.type === 'payout' || t.type === 'withdraw') &&
          (t.status === 'paid' ||
            t.status === 'success' ||
            t.status === 'completed' ||
            t.status === 'approved')
      )
      .reduce((sum, t) => {
        const raw = Math.abs(parseFloat(t.amount as any) || 0);
        return sum + (raw >= 10000000 && raw % 100 === 0 ? raw / 100 : raw);
      }, 0);

    // 3) Kutilayotgan Chiqim (Pending withdrawals waiting for admin decision)
    const workerPendingPayout = transactions
      .filter(
        (t) =>
          (t.type === 'payout' || t.type === 'withdraw') &&
          (t.status === 'pending' || t.status === 'kutilmoqda')
      )
      .reduce((sum, t) => {
        const raw = Math.abs(parseFloat(t.amount as any) || 0);
        return sum + (raw >= 10000000 && raw % 100 === 0 ? raw / 100 : raw);
      }, 0);

    // Combined financial records for the ledger
    const combinedRecords = [
      ...(isEmployer
        ? invoices.map((inv) => ({
            kind: 'invoice' as const,
            id: inv.id,
            ref: inv.invoiceNumber || `INV-${inv.id.substring(0, 8)}`,
            amount: inv.amount,
            status: inv.status,
            date: inv.sentAt || inv.paidAt || '',
            note: inv.sentTo ? `Yuborildi: ${inv.sentTo}` : "Hisob-faktura (Invois)",
            isIncome: true,
          }))
        : []),
      ...transactions.map((tx) => {
        const isIncome =
          tx.type === 'income' ||
          tx.type === 'deposit' ||
          tx.type === 'worker_earning' ||
          tx.type === 'completion_bonus';

        let note = tx.type === 'income' ? "Kirim (To'lov)" : 'Chiqim (Yechib olish/Qaytarish)';
        if (tx.type === 'worker_earning') note = "Ish haqi (Ish yakunlandi)";
        else if (tx.type === 'completion_bonus') note = "Bonus mukofoti";
        else if (tx.type === 'payout') note = "Kartaga to'lov (Chiqim)";
        else if (tx.type === 'withdraw') note = "Yechib olish so'rovi";
        else if (tx.type === 'deposit') note = "Depozit to'ldirish";

        const rawAmount = parseFloat(tx.amount as any) || 0;
        const normalizedAmount =
          rawAmount >= 10000000 && rawAmount % 100 === 0 ? rawAmount / 100 : rawAmount;

        return {
          kind: 'transaction' as const,
          id: tx.id,
          ref: `ID: ${tx.id.substring(0, 8)}`,
          amount: normalizedAmount,
          status: tx.status,
          date: tx.createdAt || '',
          note,
          isIncome,
        };
      }),
      // For workers: if there are completed jobs that don't have an explicit worker_earning transaction row in transactions table,
      // include them as completed job earnings (Ish haqi) so worker's completed work is reflected as income
      ...(!isEmployer && workerEarnedTxs === 0
        ? completedOrders.map((o) => ({
            kind: 'transaction' as const,
            id: `order-${o.id}`,
            ref: o.title || `ISH-${o.id.substring(0, 8)}`,
            amount: parseFloat(o.amount as any) || 0,
            status: 'completed',
            date: o.date || '',
            note: `Ish haqi (${o.title || "Bajarilgan ish"})`,
            isIncome: true,
          }))
        : []),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const incomeRecords = combinedRecords.filter((rec) => rec.isIncome);
    const payoutRecords = combinedRecords.filter((rec) => !rec.isIncome);

    const filteredRecords = combinedRecords.filter((rec) => {
      if (financeFilter === 'invoices') return rec.kind === 'invoice';
      if (financeFilter === 'transactions') return rec.kind === 'transaction';
      if (financeFilter === 'income') return rec.isIncome;
      if (financeFilter === 'payout') return !rec.isIncome;
      return true;
    });

    return (
      <div className="space-y-3.5">
        {/* Top 3 Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Faol E'lonlar Byudjeti (Ish beruvchi) yoki Faol Ishlar Byudjeti (Ishchi) */}
          <div className="p-3.5 sm:p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                {isEmployer ? "Faol E'lonlar Byudjeti" : "Faol Ishlar Byudjeti"}
              </span>
              <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20">
                <Briefcase size={14} />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight">
              {formatCurrency(activeJobsTotal)}{' '}
              <span className="text-[11px] font-bold text-slate-400">UZS</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
              {activeJobs.length > 0
                ? `${activeJobs.length} ta faol ${isEmployer ? "e'lon" : "ish"}`
                : `Faol ${isEmployer ? "e'lonlar" : "ishlar"} yo'q`}
            </span>
          </div>

          {/* 2. Qilingan To'lovlar (Ish beruvchi) yoki Jami Ishlangan (Ishchi) */}
          <div className="p-3.5 sm:p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                {isEmployer ? "Qilingan To'lovlar" : 'Jami Ishlangan'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                {isEmployer ? <CheckCheck size={14} /> : <TrendingUp size={14} />}
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono tracking-tight">
              {formatCurrency(isEmployer ? totalPaidToUs : workerTotalEarned)}{' '}
              <span className="text-[11px] font-bold text-emerald-500">UZS</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600/80 block mt-0.5">
              {isEmployer
                ? "Bizga to'langan summa"
                : completedOrders.length > 0
                ? `${completedOrders.length} ta bajarilgan ish`
                : "Yakunlangan ishlar daromadi"}
            </span>
          </div>

          {/* 3. To'lov Kutilmoqda (Ish beruvchi) yoki Yechib Olingan (Ishchi) */}
          <div className="p-3.5 sm:p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isEmployer ? 'text-amber-600' : 'text-indigo-600'
                }`}
              >
                {isEmployer ? "To'lov Kutilmoqda" : 'Yechib Olingan'}
              </span>
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                  isEmployer
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}
              >
                {isEmployer ? <Clock size={14} /> : <ArrowUpRight size={14} />}
              </div>
            </div>
            <div
              className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                isEmployer ? 'text-amber-700' : 'text-indigo-700'
              }`}
            >
              {formatCurrency(isEmployer ? totalPendingOwed : workerPaidOut)}{' '}
              <span
                className={`text-[11px] font-bold ${
                  isEmployer ? 'text-amber-500' : 'text-indigo-500'
                }`}
              >
                UZS
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold block mt-0.5 ${
                isEmployer
                  ? 'text-amber-600/80'
                  : workerPendingPayout > 0
                  ? 'text-amber-600 font-bold'
                  : 'text-indigo-600/80'
              }`}
            >
              {isEmployer
                ? 'Kutilayotgan qarzdorlik'
                : workerPendingPayout > 0
                ? `Kutilmoqda: ${formatCurrency(workerPendingPayout)} UZS`
                : "Kartaga to'lab berilgan"}
            </span>
          </div>
        </div>

        {/* Tranzaksiyalar va Invoislar / Chiqimlar Tarixi */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <History size={13} />
              </div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {isEmployer ? "Tranzaksiyalar va Invoislar Tarixi" : "Tranzaksiyalar va Chiqimlar Tarixi"}
              </span>
            </div>

            {/* Quick summary chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isEmployer ? (
                <>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 flex items-center gap-1">
                    <span className="text-slate-400 font-semibold">To'langan:</span>
                    <strong className="font-mono">{formatCurrency(totalPaidToUs)} UZS</strong>
                  </span>
                  {totalPendingOwed > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">Qarzdorlik / Kutilmoqda:</span>
                      <strong className="font-mono">{formatCurrency(totalPendingOwed)} UZS</strong>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200/80 flex items-center gap-1">
                    <span className="text-slate-400 font-semibold">Chiqim (To'langan):</span>
                    <strong className="font-mono">{formatCurrency(workerPaidOut)} UZS</strong>
                  </span>
                  {workerPendingPayout > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 flex items-center gap-1">
                      <span className="text-slate-400 font-semibold">Kutilmoqda:</span>
                      <strong className="font-mono">{formatCurrency(workerPendingPayout)} UZS</strong>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sub-filter tabs */}
          <div className="px-3.5 pt-2 pb-1 border-b border-slate-100 bg-white flex gap-1">
            {isEmployer ? (
              <>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Barchasi ({combinedRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('invoices')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'invoices'
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Invoislar ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('transactions')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'transactions'
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Tranzaksiyalar ({transactions.length})
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Barchasi ({combinedRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('income')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'income'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Kirimlar ({incomeRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceFilter('payout')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    financeFilter === 'payout'
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Chiqimlar ({payoutRecords.length})
                </button>
              </>
            )}
          </div>

          {/* List of Invoices & Transactions */}
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto no-scrollbar">
            {filteredRecords.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-xs font-medium">
                Moliyaviy ma'lumotlar topilmadi
              </div>
            ) : (
              filteredRecords.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-slate-50/60 transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.kind === 'invoice'
                          ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                          : item.isIncome
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}
                    >
                      {item.kind === 'invoice' ? (
                        <FileText size={15} />
                      ) : item.isIncome ? (
                        <ArrowDownLeft size={15} />
                      ) : (
                        <ArrowUpRight size={15} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                        <span>{item.kind === 'invoice' ? 'Invois' : item.isIncome ? 'Kirim' : 'Chiqim'}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {item.ref}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                        {item.date ? formatDate(item.date) : ''} • {item.note}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span
                      className={`text-xs font-mono font-black ${
                        item.kind === 'invoice'
                          ? 'text-brand-primary'
                          : item.isIncome
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.kind === 'invoice' ? '' : item.isIncome ? '+' : '-'}
                      {formatCurrency(item.amount)} UZS
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tab 5: Reviews
  if (activeTab === 5) {
    return (
      <div className="space-y-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{a.reviewsAboutUser}</span>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
              {reviews.length} ta
            </span>
          </div>

          <div className="p-3.5 sm:p-4 space-y-2.5">
            {reviews.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-xs font-medium">{a.noReviews}</div>
            ) : (
              reviews.map((r, i) => (
                <div key={i} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-xs text-slate-900 truncate">{r.author}</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200 shrink-0">
                        ⭐ {Number(r.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] font-bold shrink-0">
                      {r.date ? formatDate(r.date) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{r.review}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tab 6: Security Sessions
  if (activeTab === 6) {
    return (
      <div className="space-y-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <AlertCircle size={13} />
              </div>
              Kirishlar Tarixi (IP va Qurilma)
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
              {sessions.length} ta
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto no-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center text-slate-400 py-8 text-xs font-medium">{a.noSessions}</div>
            ) : (
              sessions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-black text-slate-900 truncate">
                      {s.ip || a.unknownIp}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                      {s.location || a.unknown} • {s.device || a.unknown}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-3">
                    {s.date ? formatDate(s.date) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tab 7: Admin Notes
  if (activeTab === 7) {
    return (
      <div className="space-y-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[380px]">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <FileText size={13} />
              </div>
              Adminning Ichki Izohlari
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
              {notes.length} ta
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/30 no-scrollbar">
            {notes.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-xs font-medium">Hali izohlar yozilmagan</div>
            ) : (
              notes.map((n, i) => (
                <div
                  key={i}
                  className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col gap-1 max-w-[85%]"
                >
                  <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                  <span className="text-[9px] font-bold text-slate-400 text-right">{n.date ? formatDate(n.date) : ''}</span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 sm:p-3.5 border-t border-slate-100 bg-white shrink-0">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                aria-label="Izoh matni"
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={a.writeNewNote}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                required
                disabled={isSubmitting}
              />
              <button
                disabled={isSubmitting}
                type="submit"
                className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs shadow-brand-primary/20 active:scale-95"
              >
                <span>Qo'shish</span> <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
