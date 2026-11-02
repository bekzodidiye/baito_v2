import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { money } from '../../utils/money';
import { PromoCode } from './types';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';
import { 
  Ticket, Plus, Calendar, Search, Check, Copy, Percent, 
  Sparkles, Users, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import { AddPromoModal } from './AddPromoModal';
import { showToast } from '../../utils/toast';

export const AdminPromotions: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const { promotions: promos, refresh } = useAdminData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleAddPromo = async (newPromo: PromoCode) => {
    try {
      await apiClient('/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(newPromo)
      });
      showToast("Yangi promokod muvaffaqiyatli yaratildi", 'success');
      refresh();
    } catch (e: any) {
      showToast(e?.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const toggleStatus = async (id: string, currentStatus?: boolean) => {
    try {
      await apiClient(`/admin/promotions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      showToast(currentStatus ? "Promokod faolsizlantirildi" : "Promokod faollashtirildi", 'success');
      refresh();
    } catch (e: any) {
      showToast(e?.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`"${code}" promokod nusxalandi`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPromos = promos.filter(p => {
    const matchesSearch = p.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      filter === 'all' ? true :
      filter === 'active' ? p.isActive :
      !p.isActive;
    return matchesSearch && matchesStatus;
  });

  const activeCount = promos.filter(p => p.isActive).length;
  const totalUsages = promos.reduce((acc, p) => acc + (p.usageCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jami Promokodlar</span>
            <Ticket size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{promos.length} ta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Marketing kampaniyalari</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Faol Promokodlar</span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">{activeCount} ta</div>
          <div className="text-[11px] font-bold text-emerald-600/80 mt-1">Ayni paytda ishlatilayotgan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jami Foydalanishlar</span>
            <Users size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600">{totalUsages} marta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Foydalanuvchilar tomonidan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Chegirma Turlari</span>
            <Percent size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">Foiz & Fiks</div>
          <div className="text-[11px] font-bold text-amber-600 mt-1">Avtomatik hisob-kitob</div>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Promokod kodi bo'yicha qidirish..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'active', label: 'Faol' },
              { id: 'inactive', label: 'Nofaol' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filter === tab.id ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-xs shrink-0"
        >
          <Plus size={15} />
          Yangi Promokod
        </button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPromos.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <Ticket size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-bold text-xs">Hech qanday promokod topilmadi</p>
          </div>
        ) : (
          filteredPromos.map((p) => {
            const usagePercent = Math.min(100, Math.round(((p.usageCount || 0) / (p.maxUsage || 1)) * 100));
            return (
              <div key={p.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 relative shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-base bg-blue-50/80 text-blue-700 px-3 py-1 rounded-xl border border-blue-100">
                      {p.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(p.code)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Nusxalash"
                    >
                      {copiedCode === p.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => toggleStatus(p.id, p.isActive)}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition cursor-pointer ${
                      p.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {p.isActive ? 'FAOL' : 'NOFAOL'}
                  </button>
                </div>

                <div className="my-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Chegirma qiymati:</span>
                    <span className="font-black text-emerald-600 text-sm">
                      {p.discountType === 'percentage' ? `${p.amount}%` : money(p.amount, language)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Ishlatilish darajasi:</span>
                    <span className="font-bold text-slate-800">
                      {p.usageCount} / {p.maxUsage} ({usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar size={13} className="text-slate-400" /> {p.expiresAt || 'Cheklovlarsiz'}
                  </span>
                  {p.forNewUsersOnly && (
                    <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 text-[10px]">
                      Faqat Yangilar
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddPromoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPromo}
      />
    </div>
  );
};
