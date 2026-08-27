import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Download, ArrowUpRight, Award, PieChart } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const handleExport = (type: string) => {
    alert(`${type} ko'rinishidagi analitik hisobot muvaffaqiyatli yuklab olindi!`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" />
            <span>Chuqur Analitika va Platforma Hisobotlari</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foydalanuvchilar faolligi, mehnat bozori ko'rsatkichlari va moliya dinamikasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('Excel')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Excel Export
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> PDF Hisobot
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Jami Oborot (GMV)</span>
          <div className="text-lg font-black text-slate-900">485,000,000 UZS</div>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            <ArrowUpRight size={12} /> +18.4% o'tgan oyga nisbatan
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Platforma Safi Daromadi</span>
          <div className="text-lg font-black text-indigo-600">48,500,000 UZS</div>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            <ArrowUpRight size={12} /> 10% Komissiya stavkasi
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">DAU / MAU Nisbati</span>
          <div className="text-lg font-black text-slate-900">64.2%</div>
          <span className="text-[11px] font-bold text-blue-600 flex items-center gap-0.5 mt-1">
            2,840 kunlik faol user
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Bajarilgan E'lonlar %</span>
          <div className="text-lg font-black text-emerald-700">92.8%</div>
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 mt-1">
            O'rtacha bajarish: 3.5 soat
          </span>
        </div>
      </div>

      {/* Analytics Sections */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Demand Categories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Eng Talab Yuqori Kasblar (TOP 5)</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">So'nggi 30 kun</span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { name: 'Qurilish va Ta\'mirlash Ustasi', count: '1,240 e\'lon', percent: 85, color: 'bg-blue-600' },
              { name: 'Santexnika va Elektrik Hizmati', count: '980 e\'lon', percent: 72, color: 'bg-emerald-600' },
              { name: 'Yuk Tashish va Haydovchilik', count: '750 e\'lon', percent: 60, color: 'bg-indigo-600' },
              { name: 'Farroshlik va Uy Xizmatlari', count: '520 e\'lon', percent: 45, color: 'bg-amber-500' },
              { name: 'IT & Freelance Loyihalar', count: '310 e\'lon', percent: 30, color: 'bg-purple-600' },
            ].map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{cat.name}</span>
                  <span className="text-slate-500 font-semibold">{cat.count}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <PieChart size={16} className="text-blue-600" />
              <span>Hududlar Bo'yicha Faollik (Viloyatlar)</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">O'zbekiston</span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { region: 'Toshkent shahri va viloyati', share: '45% buyurtmalar', val: 45 },
              { region: 'Samarqand viloyati', share: '18% buyurtmalar', val: 18 },
              { region: "Andijon & Farg'ona vodiysi", share: '15% buyurtmalar', val: 15 },
              { region: 'Buxoro & Navoiy viloyatlari', share: '12% buyurtmalar', val: 12 },
              { region: "Qoraqalpog'iston va boshqa hududlar", share: '10% buyurtmalar', val: 10 },
            ].map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-800">
                <span>{r.region}</span>
                <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 text-[11px]">{r.share}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
