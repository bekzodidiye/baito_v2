import React from 'react';
import { AdminTab } from './types';
import {
  Wallet, LayoutDashboard, Users, Briefcase, FileCheck, DollarSign, AlertTriangle, Send, Sliders, X, User,
  Building2, Headphones, BarChart3, FolderTree, ShieldAlert, Ticket, MapPin, Bell, BellRing, Zap, FileText,
  ChevronRight,
} from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useAdminData } from './useAdminData';
import { useAuthStore } from "../../store/useAuthStore";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const userProfile = useAuthStore(s => s.userProfile);
  const setUserProfile = useAuthStore(s => s.setUserProfile);

  const { jobs, disputes, supportTickets } = useAdminData();
  const badge = (n: number) => (n > 0 ? String(n) : undefined);

  const navGroups = [
    {
      titleUz: 'Boshqaruv Markazi',
      titleRu: 'Центр управления',
      titleEn: 'Control Center',
      items: [
        { id: 'overview' as AdminTab, labelUz: 'Umumiy Statistika', labelRu: 'Общая статистика', labelEn: 'Overview Stats', icon: LayoutDashboard },
        { id: 'users' as AdminTab, labelUz: 'Foydalanuvchilar', labelRu: 'Пользователи', labelEn: 'Users & Roles', icon: Users },
        { id: 'daily_jobs' as AdminTab, labelUz: 'Kunlik Ishlar', labelRu: 'Ежедневные смены', labelEn: 'Daily Jobs', icon: Briefcase },
        { id: 'jobs' as AdminTab, labelUz: 'E\'lonlar va Moderatsiya', labelRu: 'Объявления и модерация', labelEn: 'Jobs & Moderation', icon: Briefcase, badge: badge(jobs.length) },
        { id: 'categories' as AdminTab, labelUz: 'Kategoriyalar', labelRu: 'Категории', labelEn: 'Categories', icon: FolderTree },
        { id: 'notifications' as AdminTab, labelUz: 'Bildirishnomalar', labelRu: 'Уведомления', labelEn: 'Notifications', icon: Bell },
      ],
    },
    {
      titleUz: 'Avtomatlashtirish & AI',
      titleRu: 'Автоматизация & ИИ',
      titleEn: 'Automation & AI',
      items: [
        { id: 'auto_moderation' as AdminTab, labelUz: 'Avto-Shtraf & Spam Bot', labelRu: 'Авто-Штраф & Спам Бот', labelEn: 'Auto-Penalty & Spam Bot', icon: ShieldAlert },
        { id: 'auto_matching' as AdminTab, labelUz: 'AI Avto-Matching', labelRu: 'AI Авто-Подбор', labelEn: 'AI Auto-Matching', icon: Zap },
        { id: 'auto_reports' as AdminTab, labelUz: 'Avto-Hisobot & Telegram', labelRu: 'Авто-Отчеты & Telegram', labelEn: 'Auto-Reports & Telegram', icon: FileText },
        { id: 'notification_rules' as AdminTab, labelUz: 'Auto-Xabarnoma Qoidalari', labelRu: 'Правила уведомлений', labelEn: 'Notification Rules', icon: BellRing },
      ],
    },
    {
      titleUz: 'Moliya va Xavfsizlik',
      titleRu: 'Финансы и Безопасность',
      titleEn: 'Finance & Security',
      items: [
        { id: 'transactions' as AdminTab, labelUz: 'Tranzaksiyalar', labelRu: 'Транзакции', labelEn: 'Transactions', icon: DollarSign },
        { id: 'payouts' as AdminTab, labelUz: "To'lovlar va Yechish", labelRu: 'Выплаты', labelEn: 'Payouts', icon: Wallet },
        { id: 'disputes' as AdminTab, labelUz: 'Nizolar va E\'tirozlar', labelRu: 'Споры и жалобы', labelEn: 'Disputes & Claims', icon: AlertTriangle, badge: badge(disputes.length) },
        { id: 'verifications' as AdminTab, labelUz: 'Hujjatlarni Tasdiqlash', labelRu: 'Проверка документов', labelEn: 'Verifications', icon: FileCheck },
        { id: 'audit_logs' as AdminTab, labelUz: 'Audit Loglar Stream', labelRu: 'Логи аудита', labelEn: 'Audit Logs Stream', icon: ShieldAlert },
      ],
    },
    {
      titleUz: 'Marketing & Tizim',
      titleRu: 'Маркетинг и Система',
      titleEn: 'Marketing & System',
      items: [
        { id: 'promotions' as AdminTab, labelUz: 'Promokodlar', labelRu: 'Промокоды', labelEn: 'Promotions', icon: Ticket },
        { id: 'regions' as AdminTab, labelUz: 'Hududlar & Geofencing', labelRu: 'Регионы и Геозоны', labelEn: 'Regions & Geofencing', icon: MapPin },
        { id: 'support' as AdminTab, labelUz: 'Support Ticketlar', labelRu: 'Тикеты поддержки', labelEn: 'Support Tickets', icon: Headphones, badge: badge(supportTickets.length) },
        { id: 'broadcast' as AdminTab, labelUz: 'Ommaviy Xabarnoma', labelRu: 'Массовые рассылки', labelEn: 'Broadcast Messages', icon: Send },
        { id: 'analytics' as AdminTab, labelUz: 'Chuqur Analitika', labelRu: 'Глубокая аналитика', labelEn: 'Deep Analytics', icon: BarChart3 },
        { id: 'settings' as AdminTab, labelUz: 'Tizim Sozlamalari', labelRu: 'Системные настройки', labelEn: 'System Settings', icon: Sliders },
      ],
    },
  ];

  const getGroupTitle = (group: any) => {
    if (language === 'ru') return group.titleRu;
    if (language === 'en') return group.titleEn;
    return group.titleUz;
  };

  const getItemLabel = (item: any) => {
    if (language === 'ru') return item.labelRu;
    if (language === 'en') return item.labelEn;
    return item.labelUz;
  };

  const handleSwitchRole = (mode: 'worker' | 'employer') => {
    if (userProfile) setUserProfile({ ...userProfile, selectedRole: mode });
    setCurrentScreen(mode === 'worker' ? 'jobs' : 'employer-dashboard');
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:z-10 shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Brand Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/25">
                B
              </div>
              <div>
                <h2 className="text-sm font-black text-white leading-tight tracking-tight">Baito Admin</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black text-blue-400 tracking-wider uppercase">
                    SUPER ADMIN
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg md:hidden cursor-pointer transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items (Scrollable) */}
          <div className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>{getGroupTitle(group)}</span>
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
                      }`}
                    >
                      <Icon
                        size={15}
                        className={`shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{getItemLabel(item)}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tight ${
                            isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Switcher Card */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0 space-y-2">
            <div className="px-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {language === 'ru' ? 'Перейти в панели:' : language === 'en' ? 'Switch Workspace:' : "Panellarga o'tish:"}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSwitchRole('worker')}
                className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800/90 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-800/80 cursor-pointer transition-all hover:border-blue-500/30"
              >
                <User size={12} className="text-blue-400" />
                <span>{language === 'ru' ? 'Работник' : language === 'en' ? 'Worker' : 'Ishchi'}</span>
              </button>
              <button
                onClick={() => handleSwitchRole('employer')}
                className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800/90 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-800/80 cursor-pointer transition-all hover:border-emerald-500/30"
              >
                <Building2 size={12} className="text-emerald-400" />
                <span>{language === 'ru' ? 'Работодатель' : language === 'en' ? 'Employer' : 'Ish beruvchi'}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
