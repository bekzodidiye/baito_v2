import React, { useState } from 'react';
import { CategoryItem } from './types';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: CategoryItem) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');
  const [newCatCommission, setNewCatCommission] = useState(5);
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSkills, setNewCatSkills] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const item: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon || '🛠️',
      description: newCatDesc.trim() || 'Kategoriya tavsifi',
      commissionPercent: newCatCommission,
      skills: newCatSkills ? newCatSkills.split(',').map((s) => s.trim()) : ['Umumiy xizmat'],
      activeWorkersCount: 0,
      activeJobsCount: 0,
    };
    onAdd(item);
    onClose();
    setNewCatName('');
    setNewCatDesc('');
    setNewCatSkills('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-800 text-base">Yangi Kategoriya Yaratish</h3>
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Nomi</label>
          <input
            type="text"
            required
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Masalan: Mebel Yig'ish"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Emodji / Icon</label>
            <input
              type="text"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-center"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Komissiya (%)</label>
            <input
              type="number"
              min="0"
              max="30"
              value={newCatCommission}
              onChange={(e) => setNewCatCommission(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Tavsif</label>
          <textarea
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
            rows={2}
            placeholder="Qisqacha mazmuni..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Ko'nikmalar (vergul bilan ajrating)</label>
          <input
            type="text"
            value={newCatSkills}
            onChange={(e) => setNewCatSkills(e.target.value)}
            placeholder="Laminat yotqizish, Kafel yopishtirish..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          />
        </div>
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
            className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
          >
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
};
