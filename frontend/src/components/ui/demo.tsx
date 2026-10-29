import React, { useState } from "react";
import { Orb, VARIANTS, type OrbLook } from "@/components/ui/thinking-orbs";
import { LoadingOrb, LoadingOrbPreset } from "@/components/ui/loading-orb";

const looks = Object.entries(VARIANTS).flatMap(([state, variants]) =>
  variants.map((variant) => ({ state, variant }) as OrbLook),
);

export default function Demo() {
  const [activePreset, setActivePreset] = useState<LoadingOrbPreset>('working');

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-12">
      {/* Featured Loading Orbs Showcase */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Tavsiya etilgan Premium Loading Orblari
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              "Working" (Saturn halqali to'lqin) va 3D giroskopik dinamik yuklanish holatlari
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['working', 'gyro', 'spiral', 'surge', 'rings', 'lighthouse'] as LoadingOrbPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivePreset(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activePreset === p
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Live Active Showcase Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm min-h-[220px]">
            <LoadingOrb
              variant={activePreset}
              size="md"
              colorClassName="text-brand-primary dark:text-blue-400"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <LoadingOrb variant="working" size="sm" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Working (#1 Standart)</p>
                <p className="text-[11px] text-slate-500">Saturn halqali yorug'lik to'lqini</p>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <LoadingOrb variant="gyro" size="sm" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Working Gyro 3D</p>
                <p className="text-[11px] text-slate-500">Teskari aylanuvchi 3D giroskop</p>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <LoadingOrb variant="spiral" size="sm" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Spiral Galaxy</p>
                <p className="text-[11px] text-slate-500">8 ta spiral galaktika qo'llari</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Variants Grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
          Barcha 14 ta holat va variantlar
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
          {looks.map((look) => (
            <div key={`${look.state}-${look.variant}`} className="flex flex-col items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Orb {...look} size={48} className="text-brand-primary dark:text-indigo-400" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 text-center">
                {look.state}
                {look.variant !== "default" && ` · ${look.variant}`}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
