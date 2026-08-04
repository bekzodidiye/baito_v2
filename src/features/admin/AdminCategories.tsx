import React, { useState } from 'react';
import { CategoryItem } from './types';
import { FolderTree, Plus, Trash2, Percent, Briefcase, Users, Search } from 'lucide-react';
import { AddCategoryModal } from './AddCategoryModal';

const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-1',
    name: 'Santexnika va Quvurlar',
    icon: '🔧',
    description: 'Suv quvurlari, kranlar, smesitel va kanalizatsiya ta\'mirlash',
    commissionPercent: 5,
    skills: ['Truba almashtirish', 'Kran o\'rnatish', 'Batakay tozalash', 'Nasos ta\'mirlash'],
    activeWorkersCount: 142,
    activeJobsCount: 28,
  },
  {
    id: 'cat-2',
    name: 'Elektrik va Montaj',
    icon: '⚡',
    description: 'Qandillar, rozetka va elektr shitlarni montaj qilish',
    commissionPercent: 5,
    skills: ['Rozetka montaj', 'Avtomat shit', 'Lyustra ilish', 'Kabel tortish'],
    activeWorkersCount: 198,
    activeJobsCount: 45,
  },
  {
    id: 'cat-3',
    name: 'Qurilish va G\'isht terish',
    icon: '🧱',
    description: 'Devor ko\'tarish, suvoqchilik, beton quvish va poydevor',
    commissionPercent: 4,
    skills: ['G\'isht terish', 'Suvoqchilik', 'Laminat yotqizish', 'Kafel yopishtirish'],
    activeWorkersCount: 310,
    activeJobsCount: 62,
  },
  {
    id: 'cat-4',
    name: 'Yuk tashish va Mebel',
    icon: '📦',
    description: 'Mebel yig\'ish, yuk ortish va ko\'chishga yordam berish',
    commissionPercent: 6,
    skills: ['Yuk ortish', 'Mebel yig\'ish', 'Avto yuk tashish', 'Pianino ko\'chirish'],
    activeWorkersCount: 215,
    activeJobsCount: 39,
  },
];

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCategory = (item: CategoryItem) => {
    setCategories([item, ...categories]);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`"${name}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-blue-600" size={24} />
            Kategoriyalar va Kasblar Boshqaruvi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Platfondagi barcha yo'nalishlar, komissiya stavkalari va ko'nikmalar (skills) ro'yxati
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Yangi Kategoriya Qo'shish
        </button>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Kategoriya yoki ko'nikmalarni qidirish..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-slate-50 rounded-xl border border-slate-100">{cat.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{cat.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{cat.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Komissiya</span>
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <Percent size={12} /> {cat.commissionPercent}%
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Ishchilar</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Users size={12} /> {cat.activeWorkersCount} ta
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Faol e'lonlar</span>
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <Briefcase size={12} /> {cat.activeJobsCount} ta
                </span>
              </div>
            </div>

            {/* Skills Badges */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 block">Biriktirilgan Ko'nikmalar:</span>
              <div className="flex flex-wrap gap-1.5">
                {cat.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-md border border-blue-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddCategoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCategory}
      />
    </div>
  );
};
