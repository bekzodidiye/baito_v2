import React from 'react';
import { AdminTab } from './types';
import {
  LayoutDashboard, Users, Briefcase, FileCheck, DollarSign, AlertTriangle, Send, Sliders, X, User,
  Building2, Headphones, BarChart3, FolderTree, ShieldAlert, Ticket, MapPin, BellRing, Bot, Zap, FileText, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, userProfile, setUserProfile } = useApp();

  const navGroups = [
    {
      titleUz: 'Boshqaruv Markazi',
      titleRu: 'Центр управления',
      titleEn: 'Control Center',
      items: [
        { id: 'overview' as AdminTab, labelUz: 'Umumiy Statistika', labelRu: 'Общая статистика', labelEn: 'Overview Stats', icon: LayoutDashboard },
        { id: 'users' as AdminTab, labelUz: 'Foydalanuvchilar', labelRu: 'Пользователи', labelEn: 'Users & Roles', icon: Users },
        { id: 'jobs' as AdminTab, labelUz: 'E\'lonlar va Vakansiyalar', labelRu: 'Объявления и вакансии', labelEn: 'Jobs & Moderation', icon: Briefcase, badge: '12' },
        { id: 'categories' as AdminTab, labelUz: 'Kategoriyalar', labelRu: 'Категории', labelEn: 'Categories', icon: FolderTree },
      ],
    },
    {
      titleUz: 'Avtomatlashtirish & AI',
      titleRu: 'Автоматизация & ИИ',
      titleEn: 'Automation & AI',
      items: [
        { id: 'auto_moderation' as AdminTab, labelUz: 'Avto-Shtraf & Spam Bot', labelRu: 'Авто-Штраф & Спам Бот', labelEn: 'Auto-Penalty & Spam Bot', icon: Bot },
        { id: 'auto_matching' as AdminTab, labelUz: 'AI Avto-Matching', labelRu: 'AI Авто-Подбор', labelEn: 'AI Auto-Matching', icon: Zap },
        { id: 'auto_reports' as AdminTab, labelUz: 'Avto-Hisobot & Telegram', labelRu: 'Авто-Отчеты & Telegram', labelEn: 'Auto-Reports & Telegram', icon: FileText },
        { id: 'auto_escrow_docs' as AdminTab, labelUz: 'Avto-Escrow Daloatnoma', labelRu: 'Авто-Escrow Акты', labelEn: 'Auto-Escrow Acts', icon: ShieldCheck },
        { id: 'notification_rules' as AdminTab, labelUz: 'Auto-Xabarnoma Qoidalari', labelRu: 'Правила уведомлений', labelEn: 'Notification Rules', icon: BellRing },
      ],
    },
    {
      titleUz: 'Moliya va Xavfsizlik',
      titleRu: 'Финансы и Безопасность',
      titleEn: 'Finance & Security',
      items: [
        { id: 'transactions' as AdminTab, labelUz: 'Escrow va Tranzaksiyalar', labelRu: 'Escrow и транзакции', labelEn: 'Escrow & Transactions', icon: DollarSign },
        { id: 'disputes' as AdminTab, labelUz: 'Nizolar va Shikoyatlar', labelRu: 'Споры и жалобы', labelEn: 'Disputes & Claims', icon: AlertTriangle, badge: '3' },
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
        { id: 'support' as AdminTab, labelUz: 'Support Ticketlar', labelRu: 'Тикеты поддержки', labelEn: 'Support Tickets', icon: Headphones, badge: '7' },
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
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden" />}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:z-10 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">B</div>
              <div>
                <h2 className="text-sm font-extrabold text-white leading-tight">Baito Admin</h2>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.2 rounded-full border border-blue-800/50 inline-block">SUPER ADMIN</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white md:hidden cursor-pointer"><X size={18} /></button>
          </div>

          <div className="p-2.5 space-y-4 overflow-y-auto max-h-[calc(100vh-170px)] no-scrollbar">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{getGroupTitle(group)}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); onClose(); }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="flex-1 text-left">{getItemLabel(item)}</span>
                      {item.badge && <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>{item.badge}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="p-2.5 border-t border-slate-800 bg-slate-950/50 space-y-1.5">
          <div className="px-2 text-[10px] font-extrabold text-slate-500 uppercase">{language === 'ru' ? 'Перейти в панели:' : language === 'en' ? 'Switch Mode:' : "Panellarga o'tish:"}</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => handleSwitchRole('worker')} className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl cursor-pointer">
              <User size={12} className="text-blue-400" /> {language === 'ru' ? 'Работник' : language === 'en' ? 'Worker' : 'Ishchi'}
            </button>
            <button onClick={() => handleSwitchRole('employer')} className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl cursor-pointer">
              <Building2 size={12} className="text-emerald-400" /> {language === 'ru' ? 'Работодатель' : language === 'en' ? 'Employer' : 'Ish beruvchi'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
