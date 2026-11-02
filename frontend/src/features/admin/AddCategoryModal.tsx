import React, { useState, useEffect } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { CategoryItem } from './types';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: CategoryItem) => void;
  initialData?: CategoryItem | null;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onAdd, initialData }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');
  const [newCatCommission, setNewCatCommission] = useState(5);
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSkills, setNewCatSkills] = useState('');

  useEffect(() => {
    if (initialData) {
      setNewCatName(initialData.name || '');
      setNewCatIcon(initialData.icon || '🛠️');
      setNewCatCommission(initialData.commissionPercent ?? 5);
      setNewCatDesc(initialData.description || '');
      setNewCatSkills((initialData.skills || []).join(', '));
    } else {
      setNewCatName('');
      setNewCatIcon('🛠️');
      setNewCatCommission(5);
      setNewCatDesc('');
      setNewCatSkills('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const item: CategoryItem = {
      id: initialData?.id || `cat-${Date.now()}`,
      slug: initialData?.slug,
      name: newCatName.trim(),
      icon: newCatIcon || '🛠️',
      description: newCatDesc.trim() || 'Kategoriya tavsifi',
      commissionPercent: newCatCommission,
      skills: newCatSkills ? newCatSkills.split(',').map((s) => s.trim()).filter(Boolean) : ['Umumiy xizmat'],
      activeWorkersCount: initialData?.activeWorkersCount || 0,
      activeJobsCount: initialData?.activeJobsCount || 0,
    };
    onAdd(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <h3 className="font-extrabold text-slate-900 text-base">{a.newCategoryTitle}</h3>
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Nomi</label>
          <input
              aria-label="Nomi"
            type="text"
            required
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder={a.categoryNameExample}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Emodji / Icon</label>
            <input
              aria-label="Emodji / Icon"
              type="text"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-center"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Komissiya (%)</label>
            <input
              aria-label="Komissiya (%)"
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
          <label className="text-xs font-semibold text-slate-700 block mb-1">{a.skillsCommaSeparated}</label>
          <input
              aria-label={a.skillsCommaSeparated}
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
            className="px-5 py-2.5 text-xs font-extrabold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer shadow-xs active:scale-95"
          >
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
};
