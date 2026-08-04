import React from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { TrendingUp, Users, Eye, Activity, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { EmployerPageHeader } from './EmployerPageHeader';

export const EmployerAnalytics: React.FC = () => {
  const { language, postedJobs, applications } = useEmployer();

  // Calculate stats based on real data
  const today = new Date().toISOString().split('T')[0];
  const todaysApps = applications.filter(a => a.appliedDate && a.appliedDate.startsWith(today)).length;
  
  const totalViews = postedJobs.length * 45; // Mocked views for now
  
  const filledPositions = applications.filter(a => a.status === 'hired').length;
  const totalNeeded = postedJobs.reduce((acc, job) => acc + parseInt(job.neededWorkers || '1', 10), 0);
  const fillRate = totalNeeded > 0 ? Math.round((filledPositions / totalNeeded) * 100) : 0;
  
  const totalCost = postedJobs.reduce((acc, job) => {
      const salary = parseInt((job.salary || '0').replace(/\D/g, ''), 10);
      return acc + (isNaN(salary) ? 0 : salary);
  }, 0);
  const avgCost = postedJobs.length > 0 ? Math.round(totalCost / postedJobs.length) : 0;
  const formattedAvgCost = (avgCost / 1000).toFixed(0) + 'K';

  // Chart data: past 7 days apps
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const count = applications.filter(a => a.appliedDate && a.appliedDate.startsWith(dStr)).length;
    const daysUz = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
    const daysRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: language === 'uz' ? daysUz[d.getDay()] : language === 'ru' ? daysRu[d.getDay()] : daysEn[d.getDay()],
      count
    };
  });
  
  const maxCount = Math.max(...chartData.map(d => d.count)) || 10;


  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? 'Statistika' : language === 'ru' ? 'Статистика' : "Analytics"}
        description={language === 'uz' ? "Ish e'lonlaringizning samaradorligi va ko'rsatkichlari" : language === 'ru' ? "Эффективность и показатели ваших объявлений" : "Effectiveness and metrics of your jobs"}
        language={language}
        showPostButton={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Card 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'uz' ? "Bugungi arizalar" : language === 'ru' ? "Заявки сегодня" : "Applications today"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} className="stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{todaysApps}</p>
            <p className="text-[11px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
              +12% {language === 'uz' ? "kechagidan" : language === 'ru' ? "вчера" : "from yesterday"}
            </p>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'uz' ? "Haftalik ko'rishlar" : language === 'ru' ? "Просмотры за неделю" : "Weekly views"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Eye size={18} className="stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{totalViews}</p>
            <p className="text-[11px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
              +8% {language === 'uz' ? "o'tgan haftadan" : language === 'ru' ? "с прошлой недели" : "from last week"}
            </p>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'uz' ? "To'ldirilgan o'rinlar" : language === 'ru' ? "Заполненные места" : "Filled positions"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={18} className="stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{fillRate}%</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              {filledPositions} / {totalNeeded} {language === 'uz' ? "ishchi qabul qilingan" : language === 'ru' ? "работников принято" : "workers hired"}
            </p>
          </div>
        </motion.div>

        {/* Card 4 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'uz' ? "O'rtacha xarajat" : language === 'ru' ? "Средние затраты" : "Average cost"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity size={18} className="stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{formattedAvgCost} <span className="text-sm font-bold text-slate-400">/ {language === 'uz' ? 'soat' : language === 'ru' ? 'час' : "hour"}</span></p>
            <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
              {language === 'uz' ? "Barcha e'lonlar bo'yicha" : language === 'ru' ? "По всем объявлениям" : "Across all jobs"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Chart Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 mt-2"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-display text-base font-black text-slate-800">
              {language === 'uz' ? "Haftalik arizalar" : language === 'ru' ? "Заявки за неделю" : "Weekly applications"}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              {language === 'uz' ? "Oxirgi 7 kun ichida tushgan arizalar dinamikasi" : language === 'ru' ? "Динамика поступивших заявок за последние 7 дней" : "Dynamics of applications received over the last 7 days"}
            </p>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent("global-toast", { detail: language === 'uz' ? "Statistika har kuni soat 00:00 da yangilanadi" : "Статистика обновляется ежедневно" }))} className="text-slate-400 hover:text-brand-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" title="Ma'lumot">
            <Info size={18} />
          </button>
        </div>

        <div className="h-48 flex items-end justify-between gap-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-end w-full gap-2 h-full group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {d.count} {language === 'uz' ? "ta ariza" : language === 'ru' ? "заявок" : "applications"}
              </div>
              
              {/* Bar */}
              <div 
                className="w-full max-w-[40px] bg-brand-primary/10 group-hover:bg-brand-primary rounded-t-lg transition-all duration-300 relative overflow-hidden"
                style={{ height: `${(d.count / maxCount) * 100}%` }}
              >
                <div className="absolute bottom-0 left-0 w-full bg-brand-primary opacity-20" style={{ height: '100%' }} />
              </div>
              
              {/* Label */}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.day}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
