import React, { useEffect, useState } from 'react';
import { ShieldAlert, Bot, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, AlertCircle } from 'lucide-react';
import { SystemSettings } from './types';

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
  // These used to start from hard-coded values and live only in React state,
  // so the list an administrator curated vanished on reload and the job
  // screener never saw it.
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Bot size={22} className="text-red-600" />
            <span>Avto-Shtraf va Spam Moderatsiya Boti</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Qoidabuzar e'lonlar va spam kontentni avtomatik aniqlash, ogohlantirish hamda hisobni bloklash bot-algoritmi
          </p>
        </div>

        {/* The screener runs whenever there is a list to run against, so this
            reports the state rather than pretending to be a switch that used
            to toggle a local boolean and nothing else. */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
            enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {enabled ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} />}
          <span>{enabled ? 'BOT FAOL' : 'BOT O\'CHIRILGAN'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Settings Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-amber-500" /> Bot Parametrlari
          </h3>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Avto-Jarima Miqdori (UZS)</label>
              <input
              aria-label="Avto-Jarima Miqdori (UZS)"
                type="number"
                step="10000"
                value={fineAmount}
                onChange={(e) => setFineAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Avto-Bloklash Davomiyligi (Soat)</label>
              <input
              aria-label="Avto-Bloklash Davomiyligi (Soat)"
                type="number"
                value={autoBanHours}
                onChange={(e) => setAutoBanHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Hisobdan Jarima Yechish</span>
                <span className="text-[10px] text-slate-500">Qoidabuzarlikda balansdan avto-yechish</span>
              </div>
              <button onClick={() => setAutoFine(!autoFine)} className="cursor-pointer">
                {autoFine ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Forbidden Words */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-red-600" /> Taqiqlangan va Spam Kalit So'zlar (Blacklist)
          </h3>

          <form onSubmit={handleAddWord} className="flex gap-2">
            <input
              aria-label="Yangi taqiqlangan so'z"
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Yangi taqiqlangan so'z kiriting..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:border-red-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Qo'shish
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {forbiddenWords.map((word) => (
              <span
                key={word}
                className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl flex items-center gap-2"
              >
                <span>#{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  className="hover:text-red-900 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 font-medium">
                {dirty ? "Saqlanmagan o'zgarishlar bor." : "Ro'yxat saqlangan va e'lon tekshiruvida qo'llanadi."}
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

            {/* There was a "recent bot actions" list here with three invented
                entries — names, job titles and penalties that never happened.
                Real moderation actions belong in the audit log. */}
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <AlertCircle size={13} /> Bot bajargan harakatlar Audit Loglar bo'limida ko'rinadi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
