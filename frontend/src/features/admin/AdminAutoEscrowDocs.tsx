import React, { useState } from 'react';
import { ShieldCheck, FileCheck, Clock, Download, CheckCircle2, ToggleLeft, ToggleRight, QrCode, FileText, Sparkles } from 'lucide-react';

export const AdminAutoEscrowDocs: React.FC = () => {
  const [autoReleaseHours, setAutoReleaseHours] = useState(24);
  const [autoReleaseEnabled, setAutoReleaseEnabled] = useState(true);
  const [autoChekEnabled, setAutoChekEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'act_preview'>('settings');

  const sampleContract = {
    id: 'ACT-2026-8842',
    jobTitle: 'Kvartira Santexnika Tizimini O\'rnatish va Ta\'mirlash',
    employer: 'Jahongir Toirov (Toshkent sh., Yunusobod)',
    worker: 'Jasur Bekmirov (ID: #W-1049)',
    amount: '1,200,000 UZS',
    escrowFee: '120,000 UZS',
    completedAt: '2026-07-24 14:30',
    qrVerificationCode: 'BAITO-ESCROW-VERIFIED-99128',
  };

  const handlePrintAct = () => {
    window.print();
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-600" />
            <span>Avto-Escrow Garantiya va Daloatnoma Generator</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Ish yakunlangach raqamli tamg'ali Bajarilgan Ishlar Daloatnomasini avto-yaratish va Escrow pullarini taymer bo'yicha yechish
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'settings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Avto-O'tkazma Sozlamalari
          </button>
          <button
            onClick={() => setActiveTab('act_preview')}
            className={`px-3 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'act_preview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Daloatnoma Shabloni (Act Preview)
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-1">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock size={16} className="text-amber-500" /> Escrow Avto-Release Taymeri
            </h3>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">E'tiroz Bildirish Taymer Soati</label>
                <input
                  type="number"
                  value={autoReleaseHours}
                  onChange={(e) => setAutoReleaseHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ish beruvchi ish topshirilgandan keyin {autoReleaseHours} soat ichida javob bermasa, pul ustaga avtomatik o'tkaziladi.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Avto-Release Algoritmi</span>
                  <span className="text-[10px] text-slate-500">Avtomatik pul o'tkazish rejimi</span>
                </div>
                <button onClick={() => setAutoReleaseEnabled(!autoReleaseEnabled)} className="cursor-pointer">
                  {autoReleaseEnabled ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-slate-400" />}
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Soliq / Chek Avto-Generatsiya</span>
                  <span className="text-[10px] text-slate-500">Kassa va fiskal cheklarga tayyorlash</span>
                </div>
                <button onClick={() => setAutoChekEnabled(!autoChekEnabled)} className="cursor-pointer">
                  {autoChekEnabled ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-slate-400" />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-600" /> Escrow Garantiya Qoidalari
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="font-extrabold text-emerald-900 text-xs mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> 100% Himoyalangan Hamyon
                </div>
                <p className="text-[11px] text-emerald-800/80">Mablağ Baito trasst hamyonida muzlatiladi. Usta ishni yakunlamaguncha berilmaydi.</p>
              </div>

              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="font-extrabold text-blue-900 text-xs mb-1 flex items-center gap-1.5">
                  <FileCheck size={14} /> Avto-QR Daloatnoma
                </div>
                <p className="text-[11px] text-blue-800/80">Ish topshirilishi tasdiqlangach, pul ustaga o'tadi va QR daloatnoma beriladi.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'act_preview' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">Bajarilgan Ishlar va Qabul Qilish Daloatnomasi</h3>
            </div>
            <button
              onClick={handlePrintAct}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} /> Pechat / PDF
            </button>
          </div>

          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="font-black text-slate-900 text-sm">BAITO PLATFORMA ESCROW ACT</div>
                <div className="text-[10px] text-slate-500">Hujjat raqami: {sampleContract.id}</div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                  BAJARILDI VA TO'LANDI
                </span>
                <div className="text-[10px] text-slate-400 font-medium mt-1">{sampleContract.completedAt}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">BUYURTMA VA ISH NOMI:</span>
                <span className="font-extrabold text-slate-900">{sampleContract.jobTitle}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">BUYURTMACHI (ISH BERUVCHI):</span>
                  <span className="font-bold text-slate-900">{sampleContract.employer}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">BAJARUVCHI (USTA):</span>
                  <span className="font-bold text-slate-900">{sampleContract.worker}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">SHARTNOMA SUMMASI:</span>
                  <span className="font-black text-emerald-600 text-sm">{sampleContract.amount}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">BAITO PLATFORMA FIZKAL KOMISSIYASI:</span>
                  <span className="font-bold text-slate-800">{sampleContract.escrowFee}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode size={40} className="text-slate-800 shrink-0" />
                <div>
                  <div className="font-extrabold text-slate-900 text-[11px]">Raqamli Raqamlashtirilgan Tamg'a (QR Stamp)</div>
                  <div className="text-[10px] text-slate-400 font-mono">{sampleContract.qrVerificationCode}</div>
                </div>
              </div>
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
