import React, { useState } from 'react';
import { money } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { RegionConfig } from './types';
import { useAdminData } from './useAdminData';
import { apiClient } from '../../api/client';
import { 
  MapPin, Plus, Users, Briefcase, ToggleLeft, ToggleRight, 
  Search, Trash2, Building, Percent, Banknote, ShieldCheck 
} from 'lucide-react';
import { AddRegionModal } from './AddRegionModal';
import { showToast } from '../../utils/toast';

export const AdminRegions: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const { regions, refresh } = useAdminData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleRegion = async (id: string, currentStatus?: boolean) => {
    try {
      await apiClient(`/admin/regions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      showToast(currentStatus ? "Hudud nofaol holatga o'tkazildi" : "Hudud faollashtirildi", 'success');
      refresh();
    } catch (e: any) {
      showToast(e?.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleAddRegion = async (newRegion: RegionConfig) => {
    try {
      await apiClient('/admin/regions', {
        method: 'POST',
        body: JSON.stringify(newRegion)
      });
      showToast("Yangi hudud muvaffaqiyatli qo'shildi", 'success');
      refresh();
    } catch (e: any) {
      showToast(e?.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleDeleteRegion = async (id: string, name: string) => {
    if (confirm(`"${name}" hududini o'chirmoqchimisiz?`)) {
      try {
        await apiClient(`/admin/regions/${id}`, {
          method: 'DELETE'
        });
        showToast(`"${name}" o'chirildi`, 'success');
        refresh();
      } catch (e: any) {
        showToast(e?.message || 'Xatolik yuz berdi', 'error');
      }
    }
  };

  const filtered = regions.filter((r) => r.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalDistricts = regions.reduce((acc, r) => acc + (r.districtsCount || 0), 0);
  const totalWorkersInRegions = regions.reduce((acc, r) => acc + (r.activeWorkersCount || 0), 0);
  const totalJobsInRegions = regions.reduce((acc, r) => acc + (r.activeJobsCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Viloyatlar</span>
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{regions.length} ta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Geofencing qamrovi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Tuman va Shaharlar</span>
            <Building size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600">{totalDistricts} ta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Hududiy ma'muriy birliklar</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Faol Ishchilar</span>
            <Users size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">{totalWorkersInRegions} ta</div>
          <div className="text-[11px] font-bold text-emerald-600/80 mt-1">Hududlar bo'yicha</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Jami E'lonlar</span>
            <Briefcase size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{totalJobsInRegions} ta</div>
          <div className="text-[11px] font-bold text-amber-600 mt-1">Mahalliy buyurtmalar</div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            aria-label={a.searchRegions}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={a.searchRegionsPlaceholder}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-xs shrink-0"
        >
          <Plus size={15} />
          Yangi Hudud Qo'shish
        </button>
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-bold text-xs">Hech qanday hudud topilmadi</p>
          </div>
        ) : (
          filtered.map((region) => (
            <div key={region.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{region.name}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">{region.districtsCount ?? 0} tuman / shahar</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRegion(region.id, region.isActive)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer ${
                      region.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {region.isActive ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} className="text-slate-400" />}
                    {region.isActive ? 'FAOL' : 'NOFAOL'}
                  </button>
                  <button
                    onClick={() => handleDeleteRegion(region.id, region.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Ishchilar</span>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Users size={12} className="text-blue-500" /> {region.activeWorkersCount}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">E'lonlar</span>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Briefcase size={12} className="text-indigo-500" /> {region.activeJobsCount}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">{a.minWageShort}</span>
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    {money(region.minSalary || 0, language)}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Komissiya</span>
                  <span className="text-xs font-black text-blue-600 flex items-center gap-0.5 mt-0.5">
                    <Percent size={11} /> {region.commissionPercent ?? 0}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AddRegionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddRegion}
      />
    </div>
  );
};
