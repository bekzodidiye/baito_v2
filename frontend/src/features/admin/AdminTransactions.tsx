import React, { useState } from 'react';
import { AdminTransaction } from './types';
import { DollarSign, ArrowUpRight, ArrowDownLeft, ShieldCheck, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AdminTransactionsProps {
  transactions: AdminTransaction[];
}

export const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions }) => {
  const [activeTab, setActiveTab] = useState<'tx' | 'withdrawals' | 'commission'>('tx');

  // Computed properties from transactions
  const withdrawals = transactions.filter(t => t.type === 'withdrawal').map(w => ({
    id: w.id,
    workerName: w.workerName || w.employerName || 'Noma\'lum', // fallback for user name
    cardNumber: 'Tasdiqlangan karta', // we can add bankCardMask to transaction or fetch from user
    amount: w.amount,
    requestedAt: w.createdAt || '',
    status: w.status as 'pending' | 'approved' | 'rejected',
    isDelayed: false,
  }));

  const formatSum = (val?: string | number) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return num.toLocaleString('uz-UZ') + ' UZS';
  };

  const handleApproveWithdrawal = (id: string) => {
    // This should ideally call an API
    alert("API orqali ulash kutilmoqda...");
  };

  const handleRejectWithdrawal = (id: string) => {
    const reason = prompt('Rad etish sababini kiriting:');
    if (reason) {
      alert(`API orqali ulash kutilmoqda. Sabab: ${reason}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            <span>Moliya va Pul Boshqaruvi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Depozitlar, komissiya daromadi va ishchilarning pul chiqarish so'rovlari
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { id: 'tx', label: 'Tranzaksiyalar' },
            { id: 'withdrawals', label: 'Chiqarish So\'rovlari' },
            { id: 'commission', label: 'Komissiya Hisoboti' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'tx' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase">
                <th className="p-4">Turi</th>
                <th className="p-4">Miqdor</th>
                <th className="p-4">Komissiya (10%)</th>
                <th className="p-4">Holat</th>
                <th className="p-4 text-right">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                    {tx.type === 'deposit' ? <ArrowDownLeft size={16} className="text-blue-600" /> : <ArrowUpRight size={16} className="text-emerald-600" />}
                    <span>{tx.type === 'deposit' ? 'Depozit (Muzlatilgan)' : 'Ishchiga To\'lov'}</span>
                  </td>
                  <td className="p-4 font-extrabold text-slate-900">{formatSum(tx.amount)}</td>
                  <td className="p-4 font-bold text-indigo-600">{formatSum(tx.platformFee)}</td>
                  <td className="p-4 font-bold text-emerald-700">{tx.status}</td>
                  <td className="p-4 text-right font-mono text-[11px] text-slate-400">{tx.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase">
                <th className="p-4">Ishchi</th>
                <th className="p-4">Karta</th>
                <th className="p-4">Summa</th>
                <th className="p-4">So'ralgan sana</th>
                <th className="p-4">Holat</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{w.workerName}</td>
                  <td className="p-4 font-mono">{w.cardNumber}</td>
                  <td className="p-4 font-extrabold text-emerald-700">{formatSum(w.amount)}</td>
                  <td className="p-4 text-slate-500">{w.requestedAt}</td>
                  <td className="p-4">
                    {w.isDelayed && w.status === 'pending' ? (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 font-extrabold text-[10px] rounded-full flex items-center gap-1 w-max">
                        <AlertCircle size={12} /> 24 soatdan oshdi
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 font-extrabold text-[10px] rounded-full ${w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {w.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {w.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleApproveWithdrawal(w.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer">
                          O'tkazish
                        </button>
                        <button onClick={() => handleRejectWithdrawal(w.id)} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-lg cursor-pointer">
                          Rad Etish
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'commission' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Bugungi Komissiya</span>
            <div className="text-xl font-black text-indigo-600 mt-1">1,450,000 UZS</div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Oylik Jami Komissiya</span>
            <div className="text-xl font-black text-emerald-600 mt-1">48,500,000 UZS</div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">O'rtacha Komissiya Stavkasi</span>
            <div className="text-xl font-black text-slate-900 mt-1">10.0%</div>
          </div>
        </div>
      )}
    </div>
  );
};
