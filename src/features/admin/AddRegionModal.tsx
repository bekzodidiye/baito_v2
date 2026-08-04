import React, { useState } from 'react';
import { RegionConfig } from './types';

interface AddRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (region: RegionConfig) => void;
}

export const AddRegionModal: React.FC<AddRegionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [districtsCount, setDistrictsCount] = useState(10);
  const [minSalary, setMinSalary] = useState(100000);
  const [customCommission, setCustomCommission] = useState(4);
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
      customCommission,
      isActive,
    };

    onAdd(newRegion);
    onClose();
    setName('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-800 text-base">Yangi Hudud / Viloyat Qo'shish</h3>
        
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Hudud / Viloyat Nomi</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Buxoro viloyati"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tumanlar soni</label>
            <input
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
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={customCommission}
              onChange={(e) => setCustomCommission(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Minimal Kunlik Ish Haq (so'm)</label>
          <input
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
            className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer"
          >
            Qo'shish
          </button>
        </div>
      </form>
    </div>
  );
};
