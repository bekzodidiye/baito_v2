import React, { useState } from 'react';
import { PromoCode } from './types';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';
import { Ticket, Plus, Calendar } from 'lucide-react';
import { AddPromoModal } from './AddPromoModal';



export const AdminPromotions: React.FC = () => {
  const { promotions: promos, refresh } = useAdminData();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddPromo = async (newPromo: PromoCode) => {
    try {
      await apiClient('/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(newPromo)
      });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatus = async (id: string, currentStatus?: boolean) => {
    try {
      await apiClient(`/admin/promotions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Ticket className="text-emerald-600" size={24} />
            Promokod va Marketing Tizimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Yangi foydalanuvchilarga promokodlar tarqatish, e'lon komissiyalariga chegirmalar
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Yangi Promokod Yaratish
        </button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {promos.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-slate-900 text-base bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {p.code}
              </span>
              <button
                onClick={() => toggleStatus(p.id, p.isActive)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition cursor-pointer ${
                  p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.isActive ? 'FAOL' : 'NOFAOL'}
              </button>
            </div>

            <div className="my-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Chegirma qiymati:</span>
                <span className="font-extrabold text-emerald-600">
                  {p.discountType === 'percentage' ? `${p.amount}%` : `${p.amount.toLocaleString()} so'm`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Ishlatilish darajasi:</span>
                <span className="font-bold text-slate-700">
                  {p.usageCount} / {p.maxUsage}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (p.usageCount / p.maxUsage) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={13} /> {p.expiresAt} gacha
              </span>
              {p.forNewUsersOnly && (
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Faqat Yangilar
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddPromoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPromo}
      />
    </div>
  );
};
