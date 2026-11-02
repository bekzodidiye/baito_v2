import React from 'react';
import { AdminTab } from './types';
import { RefreshCw, Menu, ShieldCheck, Globe, ChevronRight, Activity, Sparkles } from 'lucide-react';
import { useAuthStore } from "../../store/useAuthStore";

interface AdminHeaderProps {
  activeTab: AdminTab;
  onRefresh: () => void;
  loading: boolean;
  onOpenSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onRefresh,
  loading,
  onOpenSidebar,
}) => {
  const language = useAuthStore(s => s.language);
  const setLanguage = useAuthStore(s => s.setLanguage);
  const userProfile = useAuthStore(s => s.userProfile);

  const getTabTitle = (tab: AdminTab) => {
    if (language === 'ru') {
      switch (tab) {
        case 'overview': return 'Общий центр управления';
        case 'users': return 'Пользователи и роли';
        case 'daily_jobs': return 'Ежедневные смены и работы';
        case 'jobs': return 'Объявления и модерация';
        case 'verifications': return 'Верификация и документы';
        case 'disputes': return 'Споры и претензии';
        case 'transactions': return 'Транзакции';
        case 'payouts': return 'Выплаты и счета';
        case 'support': return 'Служба поддержки';
        case 'broadcast': return 'Массовые рассылки';
        case 'analytics': return 'Аналитика и отчеты';
        case 'categories': return 'Категории и навыки';
        case 'audit_logs': return 'Журнал аудита действий';
        case 'promotions': return 'Промокоды и акции';
        case 'regions': return 'Регионы и геолокация';
        case 'notifications': return 'Уведомления системы';
        case 'notification_rules': return 'Правила авто-уведомлений';
        case 'auto_moderation': return 'Авто-модерация & Спам-фильтр';
        case 'auto_matching': return 'AI Авто-подбор кандидатов';
        case 'auto_reports': return 'Авто-отчеты & Telegram';
        case 'settings': return 'Системные настройки';
        default: return 'Панель администратора';
      }
    } else if (language === 'en') {
      switch (tab) {
        case 'overview': return 'General Control Center';
        case 'users': return 'Users & Roles';
        case 'daily_jobs': return 'Daily Shifts & Jobs';
        case 'jobs': return 'Listings & Moderation';
        case 'verifications': return 'Verifications & Documents';
        case 'disputes': return 'Disputes & Claims';
        case 'transactions': return 'Transactions';
        case 'payouts': return 'Payouts & Withdrawals';
        case 'support': return 'Support Tickets';
        case 'broadcast': return 'Broadcast Notifications';
        case 'analytics': return 'Deep Analytics';
        case 'categories': return 'Categories & Skills';
        case 'audit_logs': return 'Live Audit Logs';
        case 'promotions': return 'Promotions & Coupons';
        case 'regions': return 'Regions & Geofencing';
        case 'notifications': return 'System Notifications';
        case 'notification_rules': return 'Notification Rules';
        case 'auto_moderation': return 'Auto-Moderation & Anti-Spam';
        case 'auto_matching': return 'AI Auto-Matching Engine';
        case 'auto_reports': return 'Auto-Reports & Telegram';
        case 'settings': return 'System Settings';
        default: return 'Admin Panel';
      }
    } else {
      switch (tab) {
        case 'overview': return 'Umumiy Boshqaruv Markazi';
        case 'users': return 'Foydalanuvchilar va Rollar';
        case 'daily_jobs': return 'Kunlik Ishlar va Smenalar';
        case 'jobs': return 'E\'lonlar va Moderatsiya';
        case 'verifications': return 'Verifikatsiya va Hujjatlar';
        case 'disputes': return 'Nizolar va E\'tirozlar';
        case 'transactions': return 'Tranzaksiyalar';
        case 'payouts': return 'To\'lovlar va Chiqarishlar';
        case 'support': return 'Support Ticketlar va Yordam';
        case 'broadcast': return 'Ommaviy Xabarnomalar';
        case 'analytics': return 'Chuqur Analitika va Hisobotlar';
        case 'categories': return 'Kategoriyalar va Ko\'nikmalar';
        case 'audit_logs': return 'Jonli Audit Loglar Streami';
        case 'promotions': return 'Promokodlar va Chegirmalar';
        case 'regions': return 'Hududlar va Geozonalar';
        case 'notifications': return 'Tizim Bildirishnomalari';
        case 'notification_rules': return 'Auto-Xabarnoma Qoidalari';
        case 'auto_moderation': return 'Avto-Shtraf va Spam Bot';
        case 'auto_matching': return 'AI Avto-Matching Tizimi';
        case 'auto_reports': return 'Avto-Hisobot va Telegram';
        case 'settings': return 'Tizim Sozlamalari';
        default: return 'Admin Panel';
      }
    }
  };

  const getBreadcrumbCategory = (tab: AdminTab) => {
    switch (tab) {
      case 'overview':
      case 'users':
      case 'daily_jobs':
      case 'jobs':
      case 'categories':
      case 'notifications':
        return language === 'ru' ? 'Управление' : language === 'en' ? 'Management' : 'Boshqaruv';
      case 'auto_moderation':
      case 'auto_matching':
      case 'auto_reports':
      case 'notification_rules':
        return language === 'ru' ? 'Автоматизация' : language === 'en' ? 'Automation' : 'Avtomatlashtirish';
      case 'transactions':
      case 'payouts':
      case 'disputes':
      case 'verifications':
      case 'audit_logs':
        return language === 'ru' ? 'Финансы' : language === 'en' ? 'Finance' : 'Moliya & Xavfsizlik';
      default:
        return language === 'ru' ? 'Система' : language === 'en' ? 'System' : 'Tizim';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title with Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden cursor-pointer transition-colors"
            title="Menu"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-0.5">
              <span>Baito Admin</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-500 font-bold">{getBreadcrumbCategory(activeTab)}</span>
            </div>

            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate flex items-center gap-2">
              {getTabTitle(activeTab)}
            </h1>
          </div>
        </div>

        {/* Right: Operational Controls & Admin Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live System Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{language === 'ru' ? 'В сети' : language === 'en' ? 'Live System' : 'Real-vaqt tizimi'}</span>
          </div>

          {/* Protected Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/80 text-xs font-bold" title="256-bit SSL Shifrlash">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>{language === 'ru' ? 'Защищено' : language === 'en' ? 'Protected' : 'Xavfsiz holatda'}</span>
          </div>

          {/* Language Selector Pill */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/70 p-1 px-2.5 rounded-xl border border-slate-200/80 transition-colors">
            <Globe size={13} className="text-slate-500 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'uz' | 'ru' | 'en')}
              className="bg-transparent font-extrabold text-xs text-slate-800 focus:outline-none cursor-pointer pr-1"
              aria-label="Tilni tanlash"
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>

          {/* Refresh Action Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs hover:border-slate-300"
            title="Ma'lumotlarni yangilash"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span className="hidden sm:inline font-bold">
              {language === 'ru' ? 'Обновить' : language === 'en' ? 'Refresh' : 'Yangilash'}
            </span>
          </button>

          {/* Admin Profile Chip */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Administrator'}
              </div>
              <div className="text-[10px] font-black text-blue-600 tracking-wider uppercase">
                SUPER ADMIN
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
