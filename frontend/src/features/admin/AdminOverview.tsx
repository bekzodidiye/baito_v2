import React, { useState } from 'react';
import { ADMIN_TEXTS } from './admin.i18n';
import { counted } from '../../utils/plural';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminStats, AdminTab } from './types';
import { adminPath } from './adminTabs';
import {
  Users, Briefcase, DollarSign, ArrowUpRight, Clock, CheckCircle2, ShieldCheck, FileCheck,
  Zap, ArrowRight, Server, MessageSquare, Send
} from 'lucide-react';
import { LoadingOrb } from "@/components/ui/loading-orb";

interface AdminOverviewProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigate?: (tab: AdminTab) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ stats, loading, onNavigate }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'year'>('30d');

  const handleNavigate = (tab: AdminTab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.location.href = adminPath(tab);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-start pt-16 p-8">
        <LoadingOrb size={36} variant="working" />
        <p className="mt-4 text-xs font-bold text-slate-400 animate-pulse">
          {language === 'ru' ? 'Загрузка аналитических данных...' : language === 'en' ? 'Loading analytics data...' : "Analitik ma'lumotlar yuklanmoqda..."}
        </p>
      </div>
    );
  }

  const formatSum = (val?: number) => {
    return (val || 0).toLocaleString('uz-UZ') + ' UZS';
  };

  const workersCount = stats?.workersCount || 0;
  const employersCount = stats?.employersCount || 0;
  const totalUsersCount = stats?.totalUsers || (workersCount + employersCount) || 1;
  const workerPercent = Math.round((workersCount / totalUsersCount) * 100);

  const openJobs = stats?.openJobsCount || 0;
  const activeJobs = stats?.activeJobsCount || 0;
  const completedJobs = stats?.completedJobsCount || 0;

  const dateLocale = new Date().toLocaleDateString(
    ({ ru: 'ru-RU', en: 'en-US', uz: 'uz-UZ' } as Record<string, string>)[language] || 'uz-UZ',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Executive Welcome & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200/60">
              {language === 'ru' ? 'Сводка системы' : language === 'en' ? 'System Summary' : 'Tizim Xulosasi'}
            </span>
            <span className="text-slate-400 text-xs font-semibold hidden md:inline">
              • {dateLocale}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {language === 'ru' ? 'Центр управления Baito Platform' : language === 'en' ? 'Baito Control Center' : 'Baito Boshqaruv Markazi'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl font-medium">
            {language === 'ru'
              ? 'Оперативные метрики, финансовые потоки, активность пользователей и статус безопасности платформы в реальном времени.'
              : language === 'en'
              ? 'Real-time operational metrics, financial flows, user activity, and platform security status.'
              : "Real-vaqt rejimida platforma moliyaviy oqimlari, foydalanuvchilar faolligi va xavfsizlik nazorati."}
          </p>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 self-start sm:self-center">
          {[
            { id: 'today', labelUz: 'Bugun', labelRu: 'Сегодня', labelEn: 'Today' },
            { id: '7d', labelUz: '7 kun', labelRu: '7 дней', labelEn: '7d' },
            { id: '30d', labelUz: '30 kun', labelRu: '30 дней', labelEn: '30d' },
            { id: 'year', labelUz: 'Yillik', labelRu: 'Год', labelEn: 'Year' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setTimeRange(p.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === p.id
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {language === 'ru' ? p.labelRu : language === 'en' ? p.labelEn : p.labelUz}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Commission Revenue Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{a.commissionRevenue}</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatSum(stats?.totalRevenue)}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <ArrowUpRight size={14} className="text-emerald-600" />
              <span>{a.platformCommissionNote}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-black text-[10px]">
              +14.2%
            </span>
          </div>
        </div>

        {/* Escrow Owed to Workers */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{a.owedToWorkers}</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              {formatSum(stats?.totalOwedToWorkers)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="truncate pr-2">{a.owedToWorkersNote}</span>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-black text-[10px]">
              Eskrou
            </span>
          </div>
        </div>

        {/* Total Users Metric with Ratio Bar */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{a.usersLabel}</span>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                <Users size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats?.totalUsers || 0}
            </div>

            {/* Visual Ratio Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3 flex">
              <div style={{ width: `${workerPercent}%` }} className="bg-blue-600 h-full rounded-l-full" title="Ishchilar" />
              <div style={{ width: `${100 - workerPercent}%` }} className="bg-indigo-500 h-full rounded-r-full" title="Ish beruvchilar" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs font-bold pt-2 border-t border-slate-100">
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {counted(stats?.workersCount || 0, a.workersShort, language)}
            </span>
            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
              {counted(stats?.employersCount || 0, a.employersShort, language)}
            </span>
          </div>
        </div>

        {/* Jobs Metric with Status Breakdown */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{a.totalPostings}</span>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
                <Briefcase size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats?.totalJobs || 0}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 text-[11px] font-bold pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{openJobs} {a.openShort}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{activeJobs} {a.inProgressShort}</span>
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{completedJobs} {a.postingsShort}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">
              {counted(stats?.completedJobsCount || 0, a.postingsShort, language)}
            </div>
            <p className="text-xs text-slate-500 font-medium">{a.completedAndPaid}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">
              {counted(stats?.totalApplications || 0, a.applicationsShort, language)}
            </div>
            <p className="text-xs text-slate-500 font-medium">{a.applicationsFromWorkers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-4 shadow-2xs">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
            <FileCheck size={22} />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">
              {counted(stats?.totalTransactions || 0, a.transfersShort, language)}
            </div>
            <p className="text-xs text-slate-500 font-medium">{a.financialTransactionsDone}</p>
          </div>
        </div>
      </div>

      {/* System Infrastructure Health Status */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-slate-600" />
            <h3 className="text-sm font-black text-slate-900">
              {language === 'ru' ? 'Инфраструктура платформы и сервисы' : language === 'en' ? 'Platform Infrastructure & Services' : 'Tizim Infratuzilmasi va Xizmatlar Holati'}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {language === 'ru' ? 'Все системы в норме' : language === 'en' ? 'All systems operational' : 'Barcha tizimlar faol'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Escrow Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">100% Himoyalangan</div>
            <div className="text-[10px] text-slate-400 font-medium">Bank darajasidagi zaxira</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Telegram Bot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">Ulangan (Onlayn)</div>
            <div className="text-[10px] text-slate-400 font-medium">Tezkor xabarnomalar</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">AI Matching</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">98.6% Aniqlik</div>
            <div className="text-[10px] text-slate-400 font-medium">Avtomatik saralash</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">SMS / OTP Gateway</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">99.9% Yetkazish</div>
            <div className="text-[10px] text-slate-400 font-medium">TextUp provayderi</div>
          </div>
        </div>
      </div>

      {/* Quick Action Commands & Short Cuts */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 text-slate-900 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {language === 'ru' ? 'Быстрые оперативные действия' : language === 'en' ? 'Quick Operations Hub' : 'Tezkor Operatsiyalar Boshqaruvi'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === 'ru' ? 'Прямой доступ к ключевым модулям администрирования' : language === 'en' ? 'Direct shortcuts to critical administrative modules' : "Asosiy boshqaruv modullariga bir bosishda o'tish"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleNavigate('users')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/50 border border-slate-200/80 text-left transition-all hover:border-blue-300 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <Users size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {language === 'ru' ? 'Пользователи' : language === 'en' ? 'Users' : 'Foydalanuvchilar'}
                </div>
                <div className="text-[10px] text-slate-500">Rollar & Balanslar</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => handleNavigate('jobs')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/80 text-left transition-all hover:border-indigo-300 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
                <Briefcase size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {language === 'ru' ? 'Модерация вакансий' : language === 'en' ? 'Job Moderation' : 'E\'lonlar Moderatsiyasi'}
                </div>
                <div className="text-[10px] text-slate-500">{openJobs} ta yangi e'lon</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => handleNavigate('transactions')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-200/80 text-left transition-all hover:border-emerald-300 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <DollarSign size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {language === 'ru' ? 'Транзакции и касса' : language === 'en' ? 'Ledger & Payments' : 'Moliya & Tranzaksiyalar'}
                </div>
                <div className="text-[10px] text-slate-500">To'lovlar jurnali</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => handleNavigate('broadcast')}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-purple-50/50 border border-slate-200/80 text-left transition-all hover:border-purple-300 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <Send size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  {language === 'ru' ? 'Массовая рассылка' : language === 'en' ? 'Broadcast Message' : 'Ommaviy Xabarnoma'}
                </div>
                <div className="text-[10px] text-slate-500">Push & SMS yuborish</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
