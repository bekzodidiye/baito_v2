import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { CategoryItem } from './types';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';
import {
  FolderTree, Plus, Trash2, Edit2, Percent, Briefcase, Users, Search, X,
  Tag, Layers, Sparkles
} from 'lucide-react';
import { AddCategoryModal } from './AddCategoryModal';

export const AdminCategories: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const { categories, refresh, loading } = useAdminData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWorkers = categories.reduce((sum, c) => sum + (c.activeWorkersCount || 0), 0);
  const totalJobs = categories.reduce((sum, c) => sum + (c.activeJobsCount || 0), 0);
  const avgCommission = categories.length > 0
    ? (categories.reduce((sum, c) => sum + (c.commissionPercent || 0), 0) / categories.length).toFixed(1)
    : '0';

  const handleSaveCategory = async (item: CategoryItem) => {
    try {
      if (editingCategory) {
        await apiClient(`/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(item)
        });
      } else {
        await apiClient('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(item)
        });
      }
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) {
      try {
        await apiClient(`/admin/categories/${id}`, {
          method: 'DELETE'
        });
        refresh();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Metric Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jami Yo'nalishlar</span>
            <FolderTree size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-slate-900">{categories.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">O'rtacha Komissiya</span>
            <Percent size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black font-mono text-indigo-600">{avgCommission}%</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faol Ishchilar</span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{totalWorkers} ta</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mavjud Vakansiyalar</span>
            <Briefcase size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-brand-primary">{totalJobs} ta</div>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <FolderTree size={18} />
            </div>
            <span>Kategoriyalar va Kasblar Boshqaruvi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Platformadagi barcha yo'nalishlar, komissiya stavkalari va ko'nikmalar (skills) ro'yxati
          </p>
        </div>

        <button
          onClick={() => { setEditingCategory(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-black text-xs rounded-xl shadow-xs shadow-brand-primary/20 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Yangi Kategoriya Qo'shish</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          aria-label={a.searchCategories}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={a.searchCategoriesPlaceholder}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary shadow-2xs transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Categories Cards Grid */}
      {!loading && filtered.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16 bg-white border border-slate-200/90 rounded-3xl shadow-xs">
          <FolderTree size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">
            {categories.length === 0
              ? "Hozircha kategoriya qo'shilmagan"
              : "Qidiruvga mos kategoriya topilmadi"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-slate-200/90 rounded-3xl p-5 hover:border-brand-primary/40 hover:shadow-md transition-all shadow-xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2.5 bg-slate-50 group-hover:bg-brand-primary/10 rounded-2xl border border-slate-100 group-hover:border-brand-primary/20 transition-colors">
                      {cat.icon || '💼'}
                    </span>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-brand-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 font-medium mt-0.5">
                        {cat.description || "Tavsif kiritilmagan"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingCategory(cat); setShowAddModal(true); }}
                      aria-label="Tahrirlash"
                      title="Tahrirlash"
                      className="p-1.5 text-slate-400 hover:text-brand-primary rounded-xl hover:bg-brand-primary/10 transition cursor-pointer"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      aria-label="O'chirish"
                      title="O'chirish"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Komissiya</span>
                    <span className="text-xs font-black text-brand-primary flex items-center gap-1 mt-0.5 font-mono">
                      <Percent size={12} /> {cat.commissionPercent}%
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Ishchilar</span>
                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Users size={12} /> {cat.activeWorkersCount || 0} ta
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Faol e'lonlar</span>
                    <span className="text-xs font-black text-brand-primary flex items-center gap-1 mt-0.5">
                      <Briefcase size={12} /> {cat.activeJobsCount || 0} ta
                    </span>
                  </div>
                </div>

                {/* Attached Skills Badges */}
                {(cat.skills || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 block">{a.attachedSkills}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(cat.skills || []).map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-lg border border-brand-primary/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddCategoryModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingCategory(null); }}
        onAdd={handleSaveCategory}
        initialData={editingCategory}
      />
    </div>
  );
};
