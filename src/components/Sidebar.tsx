import React from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { 
  Map, Calendar, Mail, Bell, User, Settings, HelpCircle, 
  ShieldCheck, LogOut, Briefcase, FileText, MessageSquare, 
  LayoutDashboard, PlusCircle, ChevronRight 
} from 'lucide-react';
import { Logo } from './Logo';
import { translations } from '../translations';
import { LanguageSelector } from './LanguageSelector';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

interface SidebarProps {
  onOpenModal?: (type: 'profile' | 'settings' | 'help' | 'auth') => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  screen: ScreenType;
  active: boolean;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenModal }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, isLoggedIn, logout, userProfile, unreadNotificationsCount, requireAuth } = useApp();

  const t = translations[language];
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  const handleLogout = () => {
    logout();
    showToast(t.logoutSuccess);
  };

  const workerNav: NavItem[] = [
    { id: 'qidiruv', label: t.jobSearch, icon: Map, screen: 'xarita' as ScreenType, active: currentScreen === 'qidiruv' || currentScreen === 'xarita' },
    { id: 'kalendar', label: t.calendar, icon: Calendar, screen: 'kalendar' as ScreenType, active: currentScreen === 'kalendar' },
    { id: 'xabarlar', label: t.messages, icon: Mail, screen: 'xabarlar' as ScreenType, active: currentScreen === 'xabarlar' || currentScreen === 'chat' },
    { id: 'bildirishnomalar', label: language === 'uz' ? "Bildirishnomalar" : language === 'ru' ? "Уведомления" : "Notifications", icon: Bell, screen: 'bildirishnomalar' as ScreenType, active: currentScreen === 'bildirishnomalar', badge: unreadNotificationsCount },
  ];

  const employerNav: NavItem[] = [
    { id: 'employer-dashboard', label: language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard", icon: LayoutDashboard, screen: 'employer-dashboard' as ScreenType, active: currentScreen === 'employer-dashboard' },
    { id: 'employer-jobs', label: language === 'uz' ? "E'lonlarim" : language === 'ru' ? "Мои объявления" : "My Jobs", icon: Briefcase, screen: 'employer-jobs' as ScreenType, active: currentScreen === 'employer-jobs' },
    { id: 'employer-post', label: language === 'uz' ? "E'lon joylash" : language === 'ru' ? "Новое объявление" : "Post Job", icon: PlusCircle, screen: 'employer-post' as ScreenType, active: currentScreen === 'employer-post' },
    { id: 'employer-applicants', label: language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants", icon: FileText, screen: 'employer-applicants' as ScreenType, active: currentScreen === 'employer-applicants' },
    { id: 'employer-chats', label: language === 'uz' ? "Suhbatlar" : language === 'ru' ? "Чаты" : "Chats", icon: MessageSquare, screen: 'employer-chats' as ScreenType, active: currentScreen === 'employer-chats' },
  ];

  const activeNavItems = isEmployer ? employerNav : workerNav;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 h-screen overflow-y-auto z-40 select-none">
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div onClick={() => setCurrentScreen(isEmployer ? 'employer-dashboard' : 'xarita')} className="cursor-pointer group flex items-center">
          <Logo sizeClassName="text-xl" className="group-hover:scale-[1.02] transition-transform origin-left duration-300" />
        </div>
        <LanguageSelector align="right" />
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {language === 'uz' ? "Menyu" : language === 'ru' ? "Меню" : "Menu"}
            </p>
            <nav className="space-y-1">
              {activeNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => requireAuth(item.screen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer ${
                      item.active ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="stroke-[2.2]" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${item.active ? 'bg-white text-brand-primary' : 'bg-red-500 text-white'}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {language === 'uz' ? "Hisob & Sozlamalar" : language === 'ru' ? "Аккаунт & Настройки" : "Account & Settings"}
            </p>
            <nav className="space-y-1">
              {isLoggedIn ? (
                <button
                  onClick={() => setCurrentScreen(isEmployer ? 'employer-profile' : 'profil')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer ${
                    currentScreen === 'profil' || currentScreen === 'employer-profile' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="stroke-[2.2]" />
                    <span>{t.profile}</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => onOpenModal?.('auth')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-extrabold text-[13px] bg-brand-primary text-white hover:bg-brand-primary/95 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="stroke-[2.2]" />
                    <span>{t.login}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              )}

              <button
                onClick={() => setCurrentScreen('sozlamalar')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer ${
                  currentScreen === 'sozlamalar' || currentScreen === 'xavfsizlik' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className="stroke-[2.2]" />
                  <span>{t.settings}</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentScreen('admin')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer ${
                  currentScreen === 'admin' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="stroke-[2.2]" />
                  <span>Admin Panel</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentScreen('yordam')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer ${
                  currentScreen === 'yordam' || currentScreen === 'faq' || currentScreen === 'qollanma' || currentScreen === 'shartlar' || currentScreen === 'support-chat' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="stroke-[2.2]" />
                  <span>{t.help}</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60"
            >
              <LogOut size={16} />
              <span>{t.logout}</span>
            </button>
          )}

          <div className="text-center pt-1">
            <p className="text-[10px] font-bold text-brand-primary">Baito Uzbekistan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

