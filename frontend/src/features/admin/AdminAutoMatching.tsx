import React, { useEffect, useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { Zap, CheckCircle2, UserCheck, Star, SlidersHorizontal } from 'lucide-react';

import { SystemSettings } from './types';

interface AdminAutoMatchingProps {
  settings: SystemSettings;
  onUpdateSettings: (cfg: Partial<SystemSettings>) => Promise<unknown> | void;
}

export const AdminAutoMatching: React.FC<AdminAutoMatchingProps> = ({ settings, onUpdateSettings }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  // The match threshold now filters what /jobs/recommended returns.
  const [minMatchScore, setMinMatchScore] = useState(settings.matchMinScore ?? 80);
  const [maxDistanceKm, setMaxDistanceKm] = useState(settings.matchMaxDistanceKm ?? 15);
  const [minWorkerRating, setMinWorkerRating] = useState(settings.matchMinWorkerRating ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMinMatchScore(settings.matchMinScore ?? 80);
    setMaxDistanceKm(settings.matchMaxDistanceKm ?? 15);
    setMinWorkerRating(settings.matchMinWorkerRating ?? 0);
  }, [settings.matchMinScore, settings.matchMaxDistanceKm, settings.matchMinWorkerRating]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateSettings({
        matchMinScore: Number(minMatchScore) || 0,
        matchMaxDistanceKm: Number(maxDistanceKm) || 15,
        matchMinWorkerRating: Number(minWorkerRating) || 0,
      });
    } finally {
      setSaving(false);
    }
  };
  const [autoNotifySms, setAutoNotifySms] = useState(true);
  const [autoNotifyTelegram, setAutoNotifyTelegram] = useState(true);
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);

  const sampleCandidates = [
    { id: 'W-1', name: 'Jasur Bekmirov', category: 'Santexnik', rating: 4.9, distance: '2.5 km', matchScore: 98, region: 'Toshkent sh.' },
    { id: 'W-2', name: 'Dilshod Rahmatov', category: 'Santexnik', rating: 4.8, distance: '4.1 km', matchScore: 92, region: 'Toshkent sh.' },
    { id: 'W-3', name: 'Alisher Omonov', category: 'Elektrik', rating: 4.7, distance: '8.0 km', matchScore: 84, region: 'Toshkent sh.' },
    { id: 'W-4', name: 'Nodir Zokirov', category: 'Santexnik', rating: 4.5, distance: '12.2 km', matchScore: 78, region: 'Toshkent sh.' },
  ];

  const handleRunSimulator = () => {
    // This used to claim "Push va Telegram xabarnomalari yuborildi" — nothing
    // was sent, to anyone. It shows which of the example candidates the
    // current thresholds would keep, and says so.
    const matched = sampleCandidates.filter(
      (c) => c.matchScore >= minMatchScore && c.rating >= minWorkerRating,
    );
    setNotifiedCount(matched.length);
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Zap size={22} className="text-amber-500" />
            <span>{a.autoMatchingTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Yangi e'lonlar joylanganda reytingi, ko'nikmasi va joylashuviga ko'ra eng mos ustalarga avtomatik push / Telegram xabar yuborish
          </p>
        </div>

        <button
          onClick={handleRunSimulator}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <Zap size={16} />
          <span>Algoritmni Sinash (Test Push)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <SlidersHorizontal size={16} className="text-indigo-600" /> Moslashtirish Mezonlari
          </h3>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Minimal Moslik Chegarasi (%): {minMatchScore}%</label>
              <input
              aria-label="Minimal moslik chegarasi (%)"
                type="range"
                min="50"
                max="95"
                step="5"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Maksimal Masofa Radiusi (km): {maxDistanceKm} km</label>
              <input
              aria-label="Maksimal masofa (km)"
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Minimal Usta Reytingi: {minWorkerRating} ⭐</label>
              <input
              aria-label="Minimal usta reytingi"
                type="range"
                min="3.0"
                max="4.9"
                step="0.1"
                value={minWorkerRating}
                onChange={(e) => setMinWorkerRating(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifyTelegram}
                  onChange={(e) => setAutoNotifyTelegram(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Telegram Bot orqali Avto-Xabarnoma
              </label>

              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifySms}
                  onChange={(e) => setAutoNotifySms(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Push va SMS Bildirishnoma
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <UserCheck size={16} className="text-emerald-600" /> Algoritm Simulyatori (Demo E'lon: Santexnik Kerak)
            </h3>
            {notifiedCount !== null && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full flex items-center gap-1">
                <CheckCircle2 size={13} /> {notifiedCount} ta namuna nomzod chegaradan o'tdi
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {sampleCandidates.map((c) => {
              const isEligible = c.matchScore >= minMatchScore && c.rating >= minWorkerRating;
              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isEligible ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                          <Star size={11} className="fill-amber-400 text-amber-400" /> {c.rating}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {c.category} • {c.region} • {c.distance} masofada
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${isEligible ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {c.matchScore}% Moslik
                    </span>
                    <span className="block text-[10px] text-slate-400 font-semibold mt-1">
                      {isEligible ? 'Avto-Xabar yuboriladi' : 'Mezonga mos kelmadi'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 font-medium">
                Bu sozlamalar serverda saqlanadi va tavsiya etilgan ishlarni filtrlashda qo'llanadi.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

    </div>
  );
};
