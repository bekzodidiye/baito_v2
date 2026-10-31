import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { RegionConfig } from './types';

interface AddRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (region: RegionConfig) => void;
}

export const AddRegionModal: React.FC<AddRegionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [name, setName] = useState('');
  const [districtsCount, setDistrictsCount] = useState(10);
  const [minSalary, setMinSalary] = useState(100000);
  const [commissionPercent, setCommissionPercent] = useState(2);
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRegion: RegionConfig = {
      id: `reg-${Date.now()}`,
      name: name.trim(),
      districtsCount,
      activeWorkersCount: 0,
      activeJobsCount: 0,
      minSalary,
      commissionPercent,
      isActive,
    };

    onAdd(newRegion);
    onClose();
    setName('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <h3 className="font-extrabold text-slate-900 text-base">{a.newRegionTitle}</h3>
        
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">{a.regionNameLabel}</label>
          <input
              aria-label={a.regionNameLabel}
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Buxoro viloyati"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tumanlar soni</label>
            <input
              aria-label="Tumanlar soni"
              type="number"
              min="1"
              value={districtsCount}
              onChange={(e) => setDistrictsCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Komissiya (%)</label>
            <input
              aria-label="Komissiya (%)"
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">{a.minDailyWage}</label>
          <input
              aria-label={a.minDailyWage}
            type="number"
            step="10000"
            min="50000"
            value={minSalary}
            onChange={(e) => setMinSalary(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Darhol faollashtirish (Aktiv qilish)
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
            className="px-5 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-xs active:scale-95"
          >
            Qo'shish
          </button>
        </div>
      </form>
    </div>
  );
};
