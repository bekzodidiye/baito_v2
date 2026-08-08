import React, { useState } from 'react';
import { RegionConfig } from './types';
import { MapPin, Plus, Users, Briefcase, ToggleLeft, ToggleRight, Search, Trash2 } from 'lucide-react';
import { AddRegionModal } from './AddRegionModal';

const INITIAL_REGIONS: RegionConfig[] = [
  { id: 'reg-1', name: 'Toshkent shahri', districtsCount: 12, activeWorkersCount: 1250, activeJobsCount: 340, minSalary: 150000, customCommission: 5, isActive: true },
  { id: 'reg-2', name: 'Toshkent viloyati', districtsCount: 15, activeWorkersCount: 890, activeJobsCount: 180, minSalary: 120000, customCommission: 4, isActive: true },
  { id: 'reg-3', name: 'Samarqand viloyati', districtsCount: 16, activeWorkersCount: 940, activeJobsCount: 210, minSalary: 110000, customCommission: 4, isActive: true },
  { id: 'reg-4', name: 'Farg\'ona viloyati', districtsCount: 19, activeWorkersCount: 820, activeJobsCount: 160, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-5', name: 'Andijon viloyati', districtsCount: 14, activeWorkersCount: 710, activeJobsCount: 140, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-6', name: 'Namangan viloyati', districtsCount: 12, activeWorkersCount: 650, activeJobsCount: 120, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-7', name: 'Buxoro viloyati', districtsCount: 13, activeWorkersCount: 540, activeJobsCount: 95, minSalary: 110000, customCommission: 4, isActive: true },
  { id: 'reg-8', name: 'Xorazm viloyati', districtsCount: 11, activeWorkersCount: 480, activeJobsCount: 88, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-9', name: 'Qashqadaryo viloyati', districtsCount: 15, activeWorkersCount: 620, activeJobsCount: 110, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-10', name: 'Surxondaryo viloyati', districtsCount: 15, activeWorkersCount: 510, activeJobsCount: 82, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-11', name: 'Navoiy viloyati', districtsCount: 10, activeWorkersCount: 390, activeJobsCount: 75, minSalary: 120000, customCommission: 4, isActive: true },
  { id: 'reg-12', name: 'Jizzax viloyati', districtsCount: 13, activeWorkersCount: 340, activeJobsCount: 60, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-13', name: 'Sirdaryo viloyati', districtsCount: 9, activeWorkersCount: 290, activeJobsCount: 52, minSalary: 100000, customCommission: 3.5, isActive: true },
  { id: 'reg-14', name: 'Qoraqalpog\'iston Respublikasi', districtsCount: 17, activeWorkersCount: 430, activeJobsCount: 70, minSalary: 100000, customCommission: 3.5, isActive: true },
];

export const AdminRegions: React.FC = () => {
  const [regions, setRegions] = useState<RegionConfig[]>(INITIAL_REGIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleRegion = (id: string) => {
    setRegions(regions.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  const handleAddRegion = (newRegion: RegionConfig) => {
    setRegions([newRegion, ...regions]);
  };

  const handleDeleteRegion = (id: string, name: string) => {
    if (confirm(`"${name}" hududini o'chirmoqchimisiz?`)) {
      setRegions(regions.filter((r) => r.id !== id));
    }
  };

  const filtered = regions.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-red-500" size={24} />
            Hududlar va Geofencing Sozlamalari ({regions.length} ta viloyat)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Viloyatlar va tumanlar kesimida komissiya stavkalari hamda minimal ish xaqi me'yorlari
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Yangi Hudud Qo'shish
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Hudud nomini qidirish..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:border-red-500"
        />
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((region) => (
          <div key={region.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{region.name}</h3>
                <span className="text-[11px] text-slate-400">{region.districtsCount} tuman / shahar</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRegion(region.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    region.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {region.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {region.isActive ? 'FAOL' : 'NOFAOL'}
                </button>
                <button
                  onClick={() => handleDeleteRegion(region.id, region.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Ishchilar</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Users size={12} className="text-blue-500" /> {region.activeWorkersCount}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">E'lonlar</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Briefcase size={12} className="text-indigo-500" /> {region.activeJobsCount}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Min Ish Xaqi</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  {region.minSalary.toLocaleString()} so'm
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Komissiya</span>
                <span className="text-xs font-bold text-red-600 flex items-center gap-1 mt-0.5">
                  {region.customCommission}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddRegionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddRegion}
      />
    </div>
  );
};
