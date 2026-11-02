import React from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminData } from './useAdminData';
import { BarChart3, ArrowUpRight, Award, PieChart, Users, CheckCircle2 } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const { stats, users, jobs, transactions, categories } = useAdminData();

  const parseNum = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const n = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  // Real turnover & fee calculations based on verified records
  const realTransactionVolume = transactions.reduce((acc, t) => acc + parseNum(t.amount), 0);
  const totalVolume = realTransactionVolume > 0 
    ? realTransactionVolume 
    : (stats?.totalRevenue ? stats.totalRevenue : 0);

  const realFees = transactions.reduce((acc, t) => acc + parseNum(t.platformFee), 0);
  const platformRevenue = stats?.totalRevenue || realFees || 0;

  const totalUsersCount = stats?.totalUsers || users.length;
  const workersCount = stats?.workersCount || users.filter(u => u.role === 'worker').length;
  const employersCount = stats?.employersCount || users.filter(u => u.role === 'employer').length;

  const totalJobsCount = stats?.totalJobs || jobs.length;
  const activeCount = stats?.activeJobsCount || jobs.filter(j => j.status === 'confirmed' || j.status === 'in_progress').length;
  const completedCount = stats?.completedJobsCount || jobs.filter(j => j.status === 'completed').length;
  const completionRate = totalJobsCount > 0 ? Math.round(((completedCount + activeCount) / totalJobsCount) * 100) : 0;

  // Real Top Categories
  const categoryCounts: Record<string, number> = {};
  jobs.forEach(j => {
    const cat = j.category || 'Boshqa';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCatCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;
  const colors = ['bg-brand-primary', 'bg-emerald-600', 'bg-indigo-600', 'bg-amber-500', 'bg-purple-600'];

  const displayCategories = sortedCategories.length > 0 ? sortedCategories.map(([name, count], i) => ({
    name,
    count: `${count} ta e'lon`,
    percent: Math.round((count / maxCatCount) * 100),
    color: colors[i % colors.length]
  })) : (categories.slice(0, 5).map((c: any, i: number) => ({
    name: c.name || c.title || 'Umumiy xizmatlar',
    count: '0 ta e\'lon',
    percent: 10,
    color: colors[i % colors.length]
  })));

  // Real Regional Distribution
  const regionCounts: Record<string, number> = {};
  jobs.forEach(j => {
    const reg = (j.location ? j.location.split(',')[0].trim() : 'Toshkent');
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  });

  const sortedRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const displayRegions = sortedRegions.length > 0 ? sortedRegions.map(([reg, count]) => {
    const sharePercent = totalJobsCount > 0 ? Math.round((count / totalJobsCount) * 100) : 0;
    return {
      region: reg,
      share: `${sharePercent}% buyurtmalar (${count} ta)`,
      val: sharePercent
    };
  }) : [
    { region: 'Toshkent shahri va viloyati', share: '100% buyurtmalar', val: 100 }
  ];

  const formatUzs = (val: number) => {
    return val.toLocaleString('uz-UZ').replace(/,/g, ' ') + ' UZS';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" />
            <span>{a.analyticsTitle || 'Chuqur Analitika'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foydalanuvchilar faolligi, mehnat bozori ko'rsatkichlari va moliya dinamikasi (jonli ma'lumotlar)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Jonli statistika
          </span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Jami Oborot (GMV)</span>
          <div className="text-lg font-black text-slate-900">{formatUzs(totalVolume)}</div>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            <ArrowUpRight size={12} /> Barcha e'lonlar va arizalar bo'yicha
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Platforma Daromadi</span>
          <div className="text-lg font-black text-indigo-600">{formatUzs(platformRevenue)}</div>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
            <ArrowUpRight size={12} /> 10% standart xizmat haqi
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Faol Foydalanuvchilar</span>
          <div className="text-lg font-black text-slate-900">{totalUsersCount} ta</div>
          <span className="text-[11px] font-bold text-brand-primary flex items-center gap-0.5 mt-1">
            <Users size={12} /> {workersCount} ishchi, {employersCount} ish beruvchi
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Faol & Bajarilgan %</span>
          <div className="text-lg font-black text-emerald-700">{completionRate}%</div>
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 mt-1">
            <CheckCircle2 size={12} /> Jami {totalJobsCount} ta ish o'rnidan
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
            <span className="text-[11px] font-bold text-slate-400">{a.last30Days || 'So\'nggi 30 kun'}</span>
          </div>

          <div className="space-y-3 text-xs">
            {displayCategories.map((cat, i) => (
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
              <PieChart size={16} className="text-brand-primary" />
              <span>{a.activityByRegion || 'Hududlar bo\'yicha faollik'}</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">{a.uzbekistan || 'O\'zbekiston'}</span>
          </div>

          <div className="space-y-3 text-xs">
            {displayRegions.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-800">
                <span>{r.region}</span>
                <span className="text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-lg border border-brand-primary/20 text-[11px] font-mono">{r.share}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
