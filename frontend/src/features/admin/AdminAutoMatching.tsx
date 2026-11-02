import React, { useEffect, useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Zap, CheckCircle2, UserCheck, Star, SlidersHorizontal, 
  MapPin, Target, Sparkles, Save, Loader2 
} from 'lucide-react';
import { SystemSettings } from './types';
import { showToast } from '../../utils/toast';

interface AdminAutoMatchingProps {
  settings: SystemSettings;
  onUpdateSettings: (cfg: Partial<SystemSettings>) => Promise<unknown> | void;
}

export const AdminAutoMatching: React.FC<AdminAutoMatchingProps> = ({ settings, onUpdateSettings }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
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
      showToast("Matching parametrlari saqlandi", 'success');
    } catch (e: any) {
      showToast(e?.message || 'Xatolik yuz berdi', 'error');
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
    const matched = sampleCandidates.filter(
      (c) => c.matchScore >= minMatchScore && c.rating >= minWorkerRating,
    );
    setNotifiedCount(matched.length);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Minimal Moslik</span>
            <Target size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-slate-900">{minMatchScore}%</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Algoritm saralash darajasi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Qidiruv Radiusi</span>
            <MapPin size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600">{maxDistanceKm} km</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Geolokatsiya filtri</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Minimal Reyting</span>
            <Star size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{minWorkerRating} ⭐</div>
          <div className="text-[11px] font-bold text-amber-600 mt-1">Ishchi ishonch darajasi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Aniqligi</span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">98.6%</div>
          <div className="text-[11px] font-bold text-emerald-600/80 mt-1">O'tgan oydagi ko'rsatkich</div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <span>{a.autoMatchingTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Yangi e'lonlar joylanganda reytingi, ko'nikmasi va joylashuviga ko'ra eng mos ustalarga avtomatik push / Telegram xabar yuborish
          </p>
        </div>

        <button
          onClick={handleRunSimulator}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-brand-primary/20 transition cursor-pointer active:scale-95 shrink-0"
        >
          <Zap size={14} />
          <span>Algoritmni Sinash (Test Push)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 lg:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <SlidersHorizontal size={16} className="text-brand-primary" /> Moslashtirish Mezonlari
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Minimal Moslik Chegarasi:</label>
                <span className="font-black text-brand-primary font-mono text-sm">{minMatchScore}%</span>
              </div>
              <input
                aria-label="Minimal moslik chegarasi (%)"
                type="range"
                min="50"
                max="95"
                step="5"
                value={minMatchScore}
                onChange={(e) => setMinMatchScore(Number(e.target.value))}
                className="w-full accent-brand-primary cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Maksimal Masofa Radiusi:</label>
                <span className="font-black text-indigo-600 font-mono text-sm">{maxDistanceKm} km</span>
              </div>
              <input
                aria-label="Maksimal masofa (km)"
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Minimal Usta Reytingi:</label>
                <span className="font-black text-amber-500 font-mono text-sm">{minWorkerRating} ⭐</span>
              </div>
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

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifyTelegram}
                  onChange={(e) => setAutoNotifyTelegram(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                Telegram Bot orqali Avto-Xabarnoma
              </label>

              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifySms}
                  onChange={(e) => setAutoNotifySms(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                Push va SMS Bildirishnoma
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs shadow-brand-primary/20 flex items-center justify-center gap-1.5 active:scale-95"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'Saqlanmoqda...' : 'Mezonlarni Saqlash'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <UserCheck size={16} className="text-emerald-600" /> Algoritm Simulyatori (Demo E'lon: Santexnik Kerak)
            </h3>
            {notifiedCount !== null && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-extrabold rounded-full flex items-center gap-1 text-[11px]">
                <CheckCircle2 size={13} className="text-emerald-600" /> {notifiedCount} ta nomzod saralandi
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
                    isEligible ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-slate-50/80 border-slate-200/70 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-extrabold flex items-center justify-center text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">{c.name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-brand-primary">{c.category}</span> • 
                        <span className="font-mono">{c.distance}</span> • 
                        <span>{c.region}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-amber-500 text-xs">
                      <Star size={13} className="fill-amber-400 text-amber-400" /> {c.rating}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs tabular-nums ${
                      isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {c.matchScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
