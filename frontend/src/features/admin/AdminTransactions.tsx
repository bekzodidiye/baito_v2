import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../api/client';
import { showToast } from '../../utils/toast';
import { AdminTransaction } from './types';
import {
  DollarSign, ArrowUpRight, ArrowDownLeft, AlertCircle, Wallet,
  CreditCard, CheckCircle2, Clock, XCircle, Search, Copy, Check,
  TrendingUp, FileSpreadsheet, ArrowLeftRight, PieChart, ShieldCheck
} from 'lucide-react';

interface AdminTransactionsProps {
  onRefresh?: () => void;
  transactions: AdminTransaction[];
}

export const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions, onRefresh }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [activeTab, setActiveTab] = useState<'tx' | 'withdrawals' | 'commission'>('tx');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  // Withdrawals list
  const withdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .map(w => ({
      id: w.id,
      workerName: w.workerName || w.employerName || 'Foydalanuvchi',
      cardNumber: 'Tasdiqlangan karta',
      amount: w.amount,
      requestedAt: w.createdAt || '',
      status: w.status as 'pending' | 'approved' | 'rejected',
      isDelayed: false,
    }));

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

  const filteredTransactions = transactions.filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.id.toLowerCase().includes(q) ||
      (tx.workerName && tx.workerName.toLowerCase().includes(q)) ||
      (tx.employerName && tx.employerName.toLowerCase().includes(q)) ||
      String(tx.amount).includes(q)
    );
  });

  const decide = async (id: string, action: 'approve' | 'reject', reason: string) => {
    setBusyId(id);
    try {
      await apiClient(`/admin/withdrawals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      });
      showToast(action === 'approve' ? 'Yechish tasdiqlandi' : 'Rad etildi, mablag\' qaytarildi');
      onRefresh?.();
    } catch (e: any) {
      showToast(e?.message || 'Amal bajarilmadi');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveWithdrawal = (id: string) => {
    const reference = prompt("To'lov ma'lumotnomasi (ixtiyoriy):") ?? '';
    void decide(id, 'approve', reference);
  };

  const handleRejectWithdrawal = (id: string) => {
    const reason = prompt('Rad etish sababini kiriting:');
    if (reason && reason.trim()) void decide(id, 'reject', reason.trim());
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Financial Health Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jami aylanma</span>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black font-mono text-slate-900">{formatSum(settledAmount)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Komissiya zaxirasi</span>
            <PieChart size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black font-mono text-indigo-600">{formatSum(settledFeeTotal)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kutilayotgan yechishlar</span>
            <Wallet size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{pendingWithdrawalsCount} ta so'rov</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">{a.averageCommission}</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{avgCommissionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Header Bar with Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign size={18} />
            </div>
            <span>{a.financeTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Depozitlar, komissiya daromadi va ishchilarning pul chiqarish so'rovlari
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
          {[
            { id: 'tx', label: 'Tranzaksiyalar', icon: ArrowLeftRight },
            { id: 'withdrawals', label: "Chiqarish So'rovlari", icon: Wallet, badge: pendingWithdrawalsCount > 0 ? String(pendingWithdrawalsCount) : undefined },
            { id: 'commission', label: 'Komissiya Hisoboti', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Ledger Table */}
      {activeTab === 'tx' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          {/* Search bar inside table */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ID, ism yoki summa bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="text-xs font-bold text-slate-400">
              Jami {filteredTransactions.length} ta operatsiya
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-5">Operatsiya Turi</th>
                  <th className="p-4">Miqdor</th>
                  <th className="p-4">Komissiya</th>
                  <th className="p-4">Sana</th>
                  <th className="p-4">Holat</th>
                  <th className="p-4 pr-5 text-right">Tranzaksiya ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <DollarSign size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Tranzaksiyalar mavjud emas</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'deposit'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {tx.type === 'deposit' ? "Depozit (Muzlatilgan)" : "Ishchiga To'lov"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tx.workerName || tx.employerName || 'Platforma orqali'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-black font-mono text-slate-900 text-sm">
                        {formatSum(tx.amount)}
                      </td>
                      <td className="p-4 font-bold font-mono text-indigo-600">
                        {formatSum(tx.platformFee)}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          tx.status === 'paid' || tx.status === 'released'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 pr-5 text-right font-mono text-xs">
                        <button
                          onClick={() => handleCopy(tx.id, tx.id)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-800 font-semibold cursor-pointer group/copy"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Withdrawals */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-5">{a.roleWorker}</th>
                  <th className="p-4">Karta</th>
                  <th className="p-4">Summa</th>
                  <th className="p-4">{a.requestedDate}</th>
                  <th className="p-4">Holat</th>
                  <th className="p-4 pr-5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Wallet size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Pul yechish so'rovlari yo'q</p>
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="p-4 pl-5 font-bold text-slate-900">{w.workerName}</td>
                      <td className="p-4 font-mono text-slate-600 flex items-center gap-1.5">
                        <CreditCard size={14} className="text-slate-400" />
                        <span>{w.cardNumber}</span>
                      </td>
                      <td className="p-4 font-black font-mono text-emerald-700 text-sm">
                        {formatSum(w.amount)}
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(w.requestedAt)}</td>
                      <td className="p-4">
                        {w.isDelayed && w.status === 'pending' ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 font-black text-[10px] rounded-full flex items-center gap-1 w-max border border-red-200">
                            <AlertCircle size={12} /> 24 soatdan oshdi
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 font-black text-[10px] rounded-full uppercase tracking-wider border ${
                              w.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                          >
                            {w.status.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-5 text-right">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={busyId === w.id}
                              onClick={() => handleApproveWithdrawal(w.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-2xs transition-all active:scale-95"
                            >
                              O'tkazish
                            </button>
                            <button
                              disabled={busyId === w.id}
                              onClick={() => handleRejectWithdrawal(w.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-xl border border-red-200 cursor-pointer shadow-2xs transition-all active:scale-95"
                            >
                              Rad Etish
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Commission Reports */}
      {activeTab === 'commission' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bugungi Komissiya</span>
            <div className="text-2xl font-black font-mono text-indigo-600 mt-2">{formatSum(todayCommission)}</div>
            <p className="text-xs text-slate-400 mt-1">Bugun platforma hisobiga tushgan sof mablag'</p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Oylik Jami Komissiya</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-2">{formatSum(monthCommission)}</div>
            <p className="text-xs text-slate-400 mt-1">Joriy oy bo'yicha to'langan komissiyalar</p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{a.averageCommission}</span>
            <div className="text-2xl font-black text-slate-900 mt-2">{avgCommissionRate.toFixed(1)}%</div>
            <p className="text-xs text-slate-400 mt-1">Bajarilgan shartnomalarga nisbatan o'rtacha foiz</p>
          </div>
        </div>
      )}
    </div>
  );
};
