import React, { useState } from 'react';
import { ShieldAlert, Bot, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, AlertCircle } from 'lucide-react';

export const AdminAutoModeration: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [autoFine, setAutoFine] = useState(true);
  const [fineAmount, setFineAmount] = useState(50000);
  const [autoBanHours, setAutoBanHours] = useState(24);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([
    'soxta', '1xbet', 'kazino', 'narkotik', 'stroyka bet', 'qumor', 'firibgar'
  ]);
  const [newWord, setNewWord] = useState('');

  const [botLogs] = useState([
    { id: 'LOG-1', user: 'Sherzod M.', jobTitle: '1xbet hisob to\'ldirish', word: '1xbet', action: '24 soatga bloklandi + 50,000 UZS jarima', time: ' Bugun, 11:20' },
    { id: 'LOG-2', user: 'Rustam K.', jobTitle: 'Tez pul ishlash soxta sxema', word: 'soxta', action: 'Ogohlantirish yuborildi (1/3)', time: ' Bugun, 09:45' },
    { id: 'LOG-3', user: 'Jasur B.', jobTitle: 'Kazino bot targ\'iboti', word: 'kazino', action: 'E\'lon o\'chirildi + 24 soat blok', time: ' Kecha, 18:30' },
  ]);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    if (!forbiddenWords.includes(newWord.trim().toLowerCase())) {
      setForbiddenWords([...forbiddenWords, newWord.trim().toLowerCase()]);
    }
    setNewWord('');
  };

  const handleRemoveWord = (word: string) => {
    setForbiddenWords(forbiddenWords.filter((w) => w !== word));
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

        <button
          onClick={() => setEnabled(!enabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
            enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {enabled ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} />}
          <span>{enabled ? 'BOT FAOL' : 'BOT O\'CHIRILGAN'}</span>
        </button>
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
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Yangi taqiqlangan so'z kiriting..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500"
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

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <AlertCircle size={15} className="text-blue-600" /> Bot Tomonidan Oxirgi Bajarilgan Harakatlar
            </h4>
            <div className="space-y-2">
              {botLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-slate-900">{log.user}</span> — <span className="text-slate-600 font-medium">"{log.jobTitle}"</span>
                    <div className="text-[11px] text-red-600 font-bold mt-0.5">Topilgan so'z: #{log.word} • {log.action}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
