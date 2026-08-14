import React, { useState } from 'react';
import { XCircle, X } from 'lucide-react';

interface RejectJobModalProps {
  jobTitle: string;
  onClose: () => void;
  onConfirmReject: (reason: string, comment: string) => void;
}

export const RejectJobModal: React.FC<RejectJobModalProps> = ({
  jobTitle,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('Noto\'g\'ri kategoriya');
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReject(reason, comment);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm">
            <XCircle size={18} />
            <span>E'lonni Rad Etish</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <p className="text-slate-600 font-medium">
            <strong className="text-slate-900">"{jobTitle}"</strong> e'lonini rad etmoqchimisiz?
          </p>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Rad etish sababi:</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <option value="Noto'g'ri kategoriya">Noto'g'ri kategoriya tanlangan</option>
              <option value="Narx ko'rsatilmagan">Narx noto'g'ri yoki ko'rsatilmagan</option>
              <option value="Joylashuv noto'g'ri">Joylashuv / manzil xato</option>
              <option value="Spam / Tahlil yetarsiz">Spam yoki noaniq tavsif</option>
              <option value="Boshqa">Boshqa sabab</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Ish beruvchiga izoh (Tushuntirish):</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Iltimos, e'lonni qayta tahrirlashingiz uchun sababni yozing..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none"
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
              <XCircle size={15} /> Rad Etish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
