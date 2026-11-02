import React, { useEffect, useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  ShieldAlert, Plus, Trash2, ToggleLeft, ToggleRight, 
  AlertTriangle, AlertCircle, ShieldCheck, Banknote, Clock, Save, Loader2 
} from 'lucide-react';
import { SystemSettings } from './types';
import { showToast } from '../../utils/toast';

interface AdminAutoModerationProps {
  settings: SystemSettings;
  onUpdateSettings: (cfg: Partial<SystemSettings>) => Promise<unknown> | void;
}

const DEFAULT_WORDS = ['soxta', '1xbet', 'kazino', 'narkotik', 'qumor', 'firibgar'];

const parseWords = (raw?: string | null): string[] =>
  (raw ?? '')
    .split(/[\n,]/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

export const AdminAutoModeration: React.FC<AdminAutoModerationProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [autoFine, setAutoFine] = useState((settings.spamAutoFineAmount ?? 0) > 0);
  const [fineAmount, setFineAmount] = useState(settings.spamAutoFineAmount ?? 0);
  const [autoBanHours, setAutoBanHours] = useState(settings.spamAutoBanHours ?? 0);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>(
    parseWords(settings.spamKeywords).length ? parseWords(settings.spamKeywords) : DEFAULT_WORDS,
  );
  const [newWord, setNewWord] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const stored = parseWords(settings.spamKeywords);
    if (stored.length) setForbiddenWords(stored);
    setFineAmount(settings.spamAutoFineAmount ?? 0);
    setAutoBanHours(settings.spamAutoBanHours ?? 0);
    setAutoFine((settings.spamAutoFineAmount ?? 0) > 0);
    setDirty(false);
  }, [settings.spamKeywords, settings.spamAutoFineAmount, settings.spamAutoBanHours]);

  const enabled = forbiddenWords.length > 0;

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    if (!forbiddenWords.includes(word)) {
      setForbiddenWords([...forbiddenWords, word]);
      setDirty(true);
    }
    setNewWord('');
  };

  const handleRemoveWord = (word: string) => {
    setForbiddenWords(forbiddenWords.filter((w) => w !== word));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateSettings({
        spamKeywords: forbiddenWords.join('\n'),
        spamAutoFineAmount: autoFine ? Number(fineAmount) || 0 : 0,
        spamAutoBanHours: Number(autoBanHours) || 0,
      });
      setDirty(false);
      showToast("Avto-moderatsiya sozlamalari saqlandi", 'success');
    } catch (e: any) {
      showToast(e?.message || 'Saqlashda xatolik yuz berdi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Taqiqlangan So'zlar</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{forbiddenWords.length} ta</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Blacklist bazasida</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Avto-Jarima Miqdori</span>
            <Banknote size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {autoFine ? `${Number(fineAmount).toLocaleString('uz-UZ')} UZS` : 'O\'chirilgan'}
          </div>
          <div className="text-[11px] font-bold text-emerald-600/80 mt-1">Hisobdan avto-yechish</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Bloklash Muddati</span>
            <Clock size={16} className="text-brand-primary" />
          </div>
          <div className="text-xl font-black text-slate-900">{autoBanHours} soat</div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Avtomatik cheklov</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Bot Holati</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {enabled ? 'Faol' : 'O\'chirilgan'}
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-1">Real-vaqt skaneri</div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-600" />
            <span>{a.autoModerationTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Qoidabuzar e'lonlar va spam kontentni avtomatik aniqlash, ogohlantirish hamda hisobni bloklash bot-algoritmi
          </p>
        </div>

        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-2xs border ${
            enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {enabled ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-slate-400" />}
          <span>{enabled ? 'BOT FAOL' : 'BOT O\'CHIRILGAN'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Settings Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 lg:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-brand-primary" /> Bot Parametrlari
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Avto-Jarima Miqdori (UZS)</label>
              <input
                aria-label="Avto-Jarima Miqdori (UZS)"
                type="number"
                step="10000"
                value={fineAmount}
                onChange={(e) => setFineAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{a.autoBanDuration}</label>
              <input
                aria-label={a.autoBanDuration}
                type="number"
                value={autoBanHours}
                onChange={(e) => setAutoBanHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Hisobdan Jarima Yechish</span>
                <span className="text-[10px] text-slate-500">Qoidabuzarlikda balansdan avto-yechish</span>
              </div>
              <button 
                type="button"
                onClick={() => setAutoFine(!autoFine)} 
                className="cursor-pointer"
              >
                {autoFine ? <ToggleRight size={28} className="text-emerald-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Forbidden Words */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 lg:col-span-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-rose-600" /> Taqiqlangan va Spam Kalit So'zlar (Blacklist)
          </h3>

          <form onSubmit={handleAddWord} className="flex gap-2">
            <input
              aria-label={a.newBannedWord}
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder={a.newBannedWordPlaceholder}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs shadow-brand-primary/20 active:scale-95"
            >
              <Plus size={14} /> Qo'shish
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2 max-h-48 overflow-y-auto">
            {forbiddenWords.map((word) => (
              <span
                key={word}
                className="px-3 py-1 bg-rose-50 border border-rose-200/70 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
              >
                <span>#{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  className="hover:text-rose-950 cursor-pointer p-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 font-medium">
              {dirty ? "Saqlanmagan o'zgarishlar mavjud." : "Ro'yxat saqlangan va e'lon tekshiruvida qo'llanadi."}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-xs shadow-brand-primary/20 flex items-center justify-center gap-1.5 active:scale-95"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
