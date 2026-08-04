import React from 'react';
import { AdminTab } from './types';
import { RefreshCw, Menu, ShieldCheck, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
  const { language, setLanguage } = useApp();

  const getTabTitle = (tab: AdminTab) => {
    if (language === 'ru') {
      switch (tab) {
        case 'overview': return 'Общий центр управления';
        case 'users': return 'Пользователи и роли';
        case 'jobs': return 'Объявления и модерация';
        case 'verifications': return 'Верификация и документы';
        case 'disputes': return 'Споры и претензии';
        case 'transactions': return 'Escrow и транзакции';
        case 'support': return 'Служба поддержки';
        case 'broadcast': return 'Массовые рассылки';
        case 'analytics': return 'Аналитика и отчеты';
        case 'settings': return 'Системные настройки';
        default: return 'Панель администратора';
      }
    } else if (language === 'en') {
      switch (tab) {
        case 'overview': return 'General Control Center';
        case 'users': return 'Users & Roles';
        case 'jobs': return 'Listings & Moderation';
        case 'verifications': return 'Verifications & Documents';
        case 'disputes': return 'Disputes & Claims';
        case 'transactions': return 'Escrow & Transactions';
        case 'support': return 'Support Tickets';
        case 'broadcast': return 'Broadcast Notifications';
        case 'analytics': return 'Deep Analytics';
        case 'settings': return 'System Settings';
        default: return 'Admin Panel';
      }
    } else {
      switch (tab) {
        case 'overview': return 'Umumiy Boshqaruv Markazi';
        case 'users': return 'Foydalanuvchilar va Rollar';
        case 'jobs': return 'E\'lonlar va Moderatsiya';
        case 'verifications': return 'Verifikatsiya va Hujjatlar';
        case 'disputes': return 'Nizolar va E\'tirozlar';
        case 'transactions': return 'Escrow va Tranzaksiyalar';
        case 'support': return 'Support Ticketlar va Yordam';
        case 'broadcast': return 'Ommaviy Xabarnomalar';
        case 'analytics': return 'Chuqur Analitika va Hisobotlar';
        case 'settings': return 'Tizim Sozlamalari';
        default: return 'Admin Panel';
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden cursor-pointer"
            title="Menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {getTabTitle(activeTab)}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {language === 'ru' ? 'Baito Система управления • В реальном времени' : language === 'en' ? 'Baito Admin System • Real-time' : 'Baito Boshqaruv Tizimi • Real-vaqt Rejimi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 px-2 rounded-xl border border-slate-200/80">
            <Globe size={14} className="text-slate-500 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'uz' | 'ru' | 'en')}
              className="bg-transparent font-extrabold text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold">
            <ShieldCheck size={14} />
            <span>{language === 'ru' ? 'Защищено' : language === 'en' ? 'Protected' : 'Xavfsiz holatda'}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">{language === 'ru' ? 'Обновить' : language === 'en' ? 'Refresh' : 'Yangilash'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
