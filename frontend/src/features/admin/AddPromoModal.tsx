import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { PromoCode } from './types';

interface AddPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (promo: PromoCode) => void;
}

export const AddPromoModal: React.FC<AddPromoModalProps> = ({ isOpen, onClose, onAdd }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [amount, setAmount] = useState(10);
  const [maxUsage, setMaxUsage] = useState(100);
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [forNewUsersOnly, setForNewUsersOnly] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const newPromo: PromoCode = {
      id: `promo-${Date.now()}`,
      code: code.trim().toUpperCase(),
      discountType,
      amount,
      usageCount: 0,
      maxUsage,
      expiresAt,
      isActive: true,
      forNewUsersOnly,
    };
    onAdd(newPromo);
    onClose();
    setCode('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <h3 className="font-extrabold text-slate-900 text-base">{a.newPromoTitle}</h3>
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Promokod kodi</label>
          <input
              aria-label="Promokod kodi"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masalan: YAZ2026"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tur</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            >
              <option value="percentage">Foiz (%)</option>
              <option value="fixed">Fikslangan sum</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Miqdori</label>
            <input
              aria-label="Miqdori"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Max ishlatish</label>
            <input
              aria-label="Max ishlatish"
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tugash sanasi</label>
            <input
              aria-label="Tugash sanasi"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
          <input
            type="checkbox"
            checked={forNewUsersOnly}
            onChange={(e) => setForNewUsersOnly(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Faqat yangi ro'yxatdan o'tgan foydalanuvchilar uchun
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-extrabold bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl cursor-pointer shadow-xs shadow-brand-primary/20 active:scale-95"
          >
            Yaratish
          </button>
        </div>
      </form>
    </div>
  );
};
