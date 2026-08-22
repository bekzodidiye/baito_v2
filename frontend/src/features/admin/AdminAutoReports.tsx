import React, { useState } from 'react';
import { FileText, Send, CheckCircle2, Clock, Download, MessageSquare, Sparkles } from 'lucide-react';

export const AdminAutoReports: React.FC = () => {
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [telegramChannel, setTelegramChannel] = useState('@baito_admin_stats');
  const [sentSuccess, setSentSuccess] = useState(false);

  const reportData = {
    date: '2026-07-24',
    totalRevenue: '14,850,000 UZS',
    newUsers: 142,
    activeJobs: 38,
    completedJobs: 94,
    escrowHeld: '28,400,000 UZS',
    autoFlaggedSpam: 3,
  };

  const handleSendTelegramDigest = () => {
    setSentSuccess(true);
    setTimeout(() => {
      alert(`Telegram Daily Digest muvaffaqiyatli ${telegramChannel} kanaliga yuborildi!`);
      setSentSuccess(false);
    }, 1200);
  };

  const handleDownloadCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,Ko'rsatkich,Qiymat\nJami Daromad,14850000 UZS\nYangi Foydalanuvchilar,142\nTugatilgan Ishlar,94\nEscrow Summasi,28400000 UZS";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Baito_Admin_Report_${reportData.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-indigo-600" />
            <span>Avto-Hisobot va Telegram Digest Bot</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Har kunlik hamda haftalik moliyaviy va operatsion hisobotlarni avtomatik shakllantirish va Telegram botga yuborish
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            <Download size={15} />
            <span>CSV Yuklash</span>
          </button>
          <button
            onClick={handleSendTelegramDigest}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer"
          >
            {sentSuccess ? <CheckCircle2 size={16} /> : <Send size={15} />}
            <span>{sentSuccess ? 'Yuborilmoqda...' : 'Telegramga Yuborish'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Clock size={16} className="text-amber-500" /> Avto-Yuborish Sozlamalari
          </h3>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telegram Kanal / Guruh Useri</label>
              <input
                type="text"
                value={telegramChannel}
                onChange={(e) => setTelegramChannel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Kunlik Telegram Digest (Har kuni 09:00 da)
              </label>

              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyReport}
                  onChange={(e) => setWeeklyReport(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Haftalik Yakuniy Hisobot (Dushanba 08:00)
              </label>
            </div>
          </div>
        </div>

        {/* Live Telegram Markdown Preview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 lg:col-span-2">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <MessageSquare size={16} className="text-blue-500" /> Live Telegram Post Preview
          </h3>

          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed border border-slate-800 shadow-inner space-y-2">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles size={14} /> 📊 BAITO PLATFORMA KUNLIK DIGEST ({reportData.date})
            </div>
            <div className="text-slate-300">
              ─────────────────────────────<br />
              💰 <b>Kunlik Platforma Sof Daromadi:</b> {reportData.totalRevenue}<br />
              🔒 <b>Escrow Muzlatilgan Balans:</b> {reportData.escrowHeld}<br />
              👥 <b>Yangi Ro'yxatdan O'tganlar:</b> +{reportData.newUsers} ta<br />
              🛠️ <b>Aktiv Ishlar:</b> {reportData.activeJobs} ta<br />
              ✅ <b>Tugatilgan Ishlar:</b> {reportData.completedJobs} ta<br />
              🛡️ <b>Bot Bloklagan Spam E'lonlar:</b> {reportData.autoFlaggedSpam} ta<br />
              ─────────────────────────────
            </div>
            <div className="text-slate-400 text-[11px] font-sans">
              🤖 Avtomatik tayyorlandi: Baito System Admin Bot v2.4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
