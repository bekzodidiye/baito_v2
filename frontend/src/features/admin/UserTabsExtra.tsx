import React, { useState } from 'react';
import { AdminUserDetailResponse } from './types';
import { PlusCircle, Wallet, History, AlertCircle, FileText, Send, CheckCircle, Clock, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface UserTabsExtraProps {
  detail: AdminUserDetailResponse;
  activeTab: number;
  onAddBalance: (userId: string, amount: number) => void;
}

export const UserTabsExtra: React.FC<UserTabsExtraProps> = ({ detail, activeTab, onAddBalance }) => {
  const user = detail?.user || { id: '', name: 'Foydalanuvchi', role: 'worker', balance: 0, adminNotes: [] };
  const sessions = detail?.sessions || [];
  const transactions = detail?.transactions || [];
  const orders = detail?.orders || [];
  const reviews = detail?.reviews || [];

  const { token } = useApp();
  const API = import.meta.env.VITE_API_URL || '';
  
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [notes, setNotes] = useState<{ text: string; date: string }[]>(user?.adminNotes || []);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync notes when detail changes
  React.useEffect(() => {
    if (user?.adminNotes) {
      setNotes(user.adminNotes);
    }
  }, [user?.adminNotes]);

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(topUpAmount);
    if (!isNaN(num) && num > 0 && user?.id) {
      onAddBalance(user.id, num);
      setShowTopUp(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting || !user?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${user.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newNote.trim() })
      });
      const data = await res.json();
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
      case 'completed': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1"><CheckCircle size={10} /> Yakunlangan</span>;
      case 'active': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded flex items-center gap-1"><Clock size={10} /> Faol</span>;
      case 'cancelled': return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded flex items-center gap-1"><XCircle size={10} /> Bekor qilingan</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded flex items-center gap-1"><Clock size={10} /> Kutilmoqda</span>;
    }
  };

  const formatCurrency = (val: any) => {
    if (!val) return '0';
    return parseFloat(val).toLocaleString('uz-UZ');
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr : d.toLocaleString('uz-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (activeTab === 3) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden mt-4">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Tranzaksiyalar Tarixi</span>
          </div>
          
          <div className="p-2">
            {transactions.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-sm">Tranzaksiyalar mavjud emas</div>
            ) : (
              transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-900 mb-0.5">{t.type === 'income' ? 'Kirim' : 'Chiqim'}</div>
                      <div className="text-[11px] font-semibold text-slate-500">{t.createdAt ? formatDate(t.createdAt) : ''} • ID: {t.id.substring(0,6)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[13px] font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)} UZS
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 ${t.status === 'success' ? 'bg-emerald-100 text-emerald-700' : t.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status === 'success' ? 'Muvaffaqiyatli' : t.status === 'failed' ? 'Xato' : 'Kutilmoqda'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
                <History size={14} />
              </div>
              Buyurtmalar va Ishlar Tarixi
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">Sana</th>
                  <th className="p-4 font-bold">Mijoz / Ishchi</th>
                  <th className="p-4 font-bold">Summa</th>
                  <th className="p-4 font-bold">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[13px] text-slate-500 font-medium">Buyurtmalar yo'q</td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-[13px] font-medium text-slate-600">{o.date ? formatDate(o.date) : ''}</td>
                      <td className="p-4 text-[13px] font-bold text-slate-900">{o.employerName}</td>
                      <td className="p-4 text-[13px] font-black text-emerald-600">{formatCurrency(o.amount)} UZS</td>
                      <td className="p-4">
                        {getStatusBadge(o.status)}
                      </td>
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

  if (activeTab === 4) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Joriy Balans</span>
            <div className="text-2xl font-black text-slate-900">{parseFloat(user.balance || '0').toLocaleString('uz-UZ')} <span className="text-sm font-bold text-slate-500">UZS</span></div>
          </div>
          <div className="p-5 bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Platformada Ishlangan</span>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(transactions.filter(t => t.type === 'income' && t.status === 'success').reduce((sum, t) => sum + parseFloat(t.amount as any || '0'), 0))} <span className="text-sm font-bold text-slate-500">UZS</span></div>
          </div>
        </div>

        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Wallet size={14} />
              </div>
              Balans To'ldirish (Admin)
            </span>
            <button 
              onClick={() => setShowTopUp(!showTopUp)} 
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors shadow-sm"
            >
              <PlusCircle size={14} /> Qo'shish
            </button>
          </div>

          {showTopUp && (
            <div className="p-5">
              <form onSubmit={handleTopUpSubmit} className="flex gap-3 max-w-sm">
                <input 
                  type="number" 
                  value={topUpAmount} 
                  onChange={(e) => setTopUpAmount(e.target.value)} 
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" 
                  placeholder="Summa UZS" 
                  required 
                />
                <button type="submit" className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-bold rounded-xl cursor-pointer shadow-sm shadow-brand-primary/20 transition-colors">
                  Tasdiqlash
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 5) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Foydalanuvchiga berilgan sharhlar</span>
          </div>
          
          <div className="p-5 space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-sm">Sharhlar mavjud emas</div>
            ) : (
              reviews.map((r, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-[12px] border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-slate-900">{r.author}</span>
                      <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-[11px] font-black rounded-lg flex items-center gap-1 border border-yellow-200">
                        ⭐ {Number(r.rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-bold">{r.date ? formatDate(r.date) : ''}</span>
                  </div>
                  <p className="text-[13px] text-slate-600 font-medium">{r.review}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 6) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertCircle size={14} />
              </div>
              Kirishlar Tarixi (IP va Qurilma)
            </span>
          </div>
          
          <div className="p-2">
            {sessions.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-sm">Sessiyalar mavjud emas</div>
            ) : (
              sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="text-[13px] font-bold text-slate-900 mb-0.5">{s.ip || 'Noma\'lum IP'}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{s.location || 'Noma\'lum'}, {s.device || 'Noma\'lum'}</div>
                  </div>
                  <span className="text-[12px] font-bold text-slate-400">{s.date ? formatDate(s.date) : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 7) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-[16px] border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileText size={14} />
              </div>
              Adminning Ichki Izohlari
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {notes.length === 0 ? (
              <div className="text-center text-slate-400 py-6 text-sm font-medium">Hali izohlar yozilmagan</div>
            ) : (
              notes.map((n, i) => (
                <div key={i} className="p-3.5 bg-white border border-slate-100 rounded-[12px] shadow-sm flex flex-col gap-1.5 w-max max-w-[85%]">
                  <p className="text-[13px] font-medium text-slate-700 whitespace-pre-wrap">{n.text}</p>
                  <span className="text-[10px] font-bold text-slate-400 block text-right">{n.date ? formatDate(n.date) : ''}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input 
                type="text" 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)} 
                placeholder="Yangi izoh yozing..." 
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-[13px] text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" 
                required 
                disabled={isSubmitting}
              />
              <button disabled={isSubmitting} type="submit" className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-50">
                Qo'shish <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
