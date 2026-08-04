import React, { useState } from 'react';
import { AlertTriangle, X, Ban } from 'lucide-react';

interface BanUserModalProps {
  userName: string;
  onClose: () => void;
  onConfirmBan: (reason: string, details: string) => void;
}

export const BanUserModal: React.FC<BanUserModalProps> = ({
  userName,
  onClose,
  onConfirmBan,
}) => {
  const [reason, setReason] = useState<string>('Qoidabuzarlik');
  const [details, setDetails] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmBan(reason, details);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm">
            <AlertTriangle size={18} />
            <span>Foydalanuvchini Bloklash</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <p className="text-slate-600 font-medium">
            Siz haqiqatan ham <strong className="text-slate-900">{userName}</strong> akkauntini bloklamoqchimisiz?
          </p>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Bloklash Sababi:</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="Qoidabuzarlik">Platforma qoidalarini buzish</option>
              <option value="Spam / Reklama">Spam yoki ruxsatsiz reklama</option>
              <option value="Firibgarlik">Soxta e'lon / Firibgarlik shubhasi</option>
              <option value="Haqorat / Noto'g'ri xulq">Haqoratli muomala yoki tahdid</option>
              <option value="Boshqa">Boshqa sabab</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Qo'shimcha izoh (Foydalanuvchiga yuboriladi):</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Bloklanish sababini batafsilroq yozing..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/20"
            >
              <Ban size={15} /> Bloklashni Tasdiqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
