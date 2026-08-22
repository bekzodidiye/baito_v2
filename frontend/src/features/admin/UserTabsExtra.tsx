import React, { useState } from 'react';
import { AdminUser } from './types';
import { PlusCircle } from 'lucide-react';

interface UserTabsExtraProps {
  user: AdminUser;
  activeTab: number;
  onAddBalance: (userId: string, amount: number) => void;
}

export const UserTabsExtra: React.FC<UserTabsExtraProps> = ({ user, activeTab, onAddBalance }) => {
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('100000');
  const [notes, setNotes] = useState<{ text: string; date: string }[]>([
    { text: 'Akkount verifikatsiyadan o\'tdi. Hujjatlar to\'liq.', date: '2026-07-20 14:00' },
  ]);
  const [newNote, setNewNote] = useState('');

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(topUpAmount);
    if (!isNaN(num) && num > 0) {
      onAddBalance(user.id, num);
      setShowTopUp(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      setNotes([...notes, { text: newNote, date: new Date().toLocaleString('uz-UZ') }]);
      setNewNote('');
    }
  };

  if (activeTab === 3) {
    return (
      <div className="space-y-2 text-xs">
        <div className="font-bold text-slate-900 mb-2">Buyurtmalar va Ishlar Tarixi</div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
              <tr>
                <th className="p-2.5">Sana</th>
                <th className="p-2.5">Mijoz/Ishchi</th>
                <th className="p-2.5">Summa</th>
                <th className="p-2.5">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-medium">2026-07-22</td>
                <td className="p-2.5 font-bold">Jasur Nazarov</td>
                <td className="p-2.5 font-bold text-emerald-700">250,000 UZS</td>
                <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Bajarildi</span></td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">2026-07-18</td>
                <td className="p-2.5 font-bold">Akmal Saidov</td>
                <td className="p-2.5 font-bold text-emerald-700">180,000 UZS</td>
                <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Bajarildi</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 4) {
    return (
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Joriy Balans</span>
            <div className="text-lg font-black text-emerald-700">{parseFloat(user.balance || '0').toLocaleString('uz-UZ')} UZS</div>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">Platformada Ishlangan</span>
            <div className="text-lg font-black text-indigo-800">4,300,000 UZS</div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-800">Admin orqali balans to'ldirish</span>
          <button onClick={() => setShowTopUp(!showTopUp)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer">
            <PlusCircle size={14} /> Balans Qo'shish
          </button>
        </div>

        {showTopUp && (
          <form onSubmit={handleTopUpSubmit} className="flex gap-2">
            <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl font-bold" placeholder="Summa UZS" required />
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer">Tasdiqlash</button>
          </form>
        )}
      </div>
    );
  }

  if (activeTab === 5) {
    return (
      <div className="space-y-2 text-xs">
        <div className="font-bold text-slate-900 mb-2">Foydalanuvchiga berilgan sharhlar</div>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <div className="flex justify-between items-center font-bold text-slate-800">
            <span>Sardor Alimov ⭐ 5.0</span>
            <span className="text-slate-400 text-[10px]">2026-07-20</span>
          </div>
          <p className="text-slate-600">Ishni juda sifatli bajarib berdi. Rahmat!</p>
        </div>
      </div>
    );
  }

  if (activeTab === 6) {
    return (
      <div className="space-y-3 text-xs">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-slate-700 font-medium">
          <div className="font-bold text-slate-900">Kirishlar Tarixi (IP va Qurilma)</div>
          <div>2026-07-24 10:14 — IP: 213.230.88.10 (Toshkent, Android)</div>
          <div>2026-07-23 18:30 — IP: 213.230.88.10 (Toshkent, Android)</div>
        </div>
      </div>
    );
  }

  if (activeTab === 7) {
    return (
      <div className="space-y-3 text-xs">
        <div className="font-bold text-slate-900">Adminning Ichki Izohlari</div>
        <div className="space-y-2">
          {notes.map((n, i) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 font-medium">
              <p>{n.text}</p>
              <span className="text-[10px] font-bold text-amber-700 block text-right mt-1">{n.date}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
          <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Yangi izoh qoldiring..." className="flex-1 px-3 py-2 border rounded-xl font-semibold" required />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer">Qo'shish</button>
        </form>
      </div>
    );
  }

  return null;
};
