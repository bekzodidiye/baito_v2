import React from 'react';
import { clickable } from '../utils/clickable';
import { useApp, ScreenType } from '../context/AppContext';
import { 
  Map, Calendar, MessageCircle, Bell, User, Settings, HelpCircle, 
  ShieldCheck, LogOut, Briefcase, FileText, 
  LayoutDashboard, PlusCircle, ChevronRight, ClipboardList 
} from 'lucide-react';
import { Logo } from './Logo';
import { translations } from '../translations';
import { LanguageSelector } from './LanguageSelector';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useSidebarBadges } from '../hooks/useSidebarBadges';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";
import { isProfileComplete } from '../utils/profileCompleteness';
import { motion } from 'motion/react';

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
  const language = useAuthStore(s => s.language);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const logout = useApp().logout;
    const userProfile = useAuthStore(s => s.userProfile);
    const unreadNotificationsCount = useUIStore(s => s.unreadNotificationsCount);
    const activeModal = useUIStore(s => s.activeModal);
    const activeSettingsTab = useUIStore(s => s.activeSettingsTab);
    const { pendingApplications, unreadMessages } = useSidebarBadges();
    const requireAuth = useApp().requireAuth;

  const t = translations[language];
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';
  const isAdmin = isLoggedIn && userProfile?.selectedRole === 'admin';

  const handleLogout = () => {
    logout();
    showToast(t.logoutSuccess);
  };

  const workerNav: NavItem[] = [
    { id: 'jobs', label: t.jobSearch, icon: Map, screen: 'jobs' as ScreenType, active: currentScreen === 'jobs' },
    { id: 'calendar', label: t.calendar, icon: Calendar, screen: 'calendar' as ScreenType, active: currentScreen === 'calendar' },
    { id: 'applications', label: t.myApplications, icon: ClipboardList, screen: 'applications' as ScreenType, active: currentScreen === 'applications' },
    { id: 'messages', label: t.messages, icon: MessageCircle, screen: 'messages' as ScreenType, active: currentScreen === 'messages' || currentScreen === 'chat', badge: unreadMessages },
    { id: 'notifications', label: language === 'uz' ? "Bildirishnomalar" : language === 'ru' ? "Уведомления" : "Notifications", icon: Bell, screen: 'notifications' as ScreenType, active: currentScreen === 'notifications', badge: unreadNotificationsCount },
  ];

  const employerNav: NavItem[] = [
    { id: 'employer-dashboard', label: language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard", icon: LayoutDashboard, screen: 'employer-dashboard' as ScreenType, active: currentScreen === 'employer-dashboard' },
    { id: 'employer-jobs', label: language === 'uz' ? "E'lonlarim" : language === 'ru' ? "Мои объявления" : "My Jobs", icon: Briefcase, screen: 'employer-jobs' as ScreenType, active: currentScreen === 'employer-jobs' },
    { id: 'employer-post', label: language === 'uz' ? "E'lon joylash" : language === 'ru' ? "Новое объявление" : "Post Job", icon: PlusCircle, screen: 'employer-post' as ScreenType, active: currentScreen === 'employer-post' },
    { id: 'employer-applicants', label: language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants", icon: FileText, screen: 'employer-applicants' as ScreenType, active: currentScreen === 'employer-applicants', badge: pendingApplications },
    { id: 'employer-chats', label: language === 'uz' ? "Xabarlar" : language === 'ru' ? "Сообщения" : "Messages", icon: MessageCircle, screen: 'employer-chats' as ScreenType, active: currentScreen === 'employer-chats', badge: unreadMessages },
    // An employer gets notified about the same things a worker does - someone
    // applied, a shift was confirmed, an invoice was issued - and the screen
    // and its unread count were already built and already reachable at
    // /notifications for any signed-in role. Only the way in was missing.
    { id: 'notifications', label: language === 'uz' ? "Bildirishnomalar" : language === 'ru' ? "Уведомления" : "Notifications", icon: Bell, screen: 'notifications' as ScreenType, active: currentScreen === 'notifications', badge: unreadNotificationsCount },
  ];

  const activeNavItems = isEmployer ? employerNav : workerNav;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 h-screen overflow-y-auto z-40 select-none">
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div {...clickable(() => setCurrentScreen(isEmployer ? 'employer-dashboard' : 'jobs'))} className="cursor-pointer group flex items-center">
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
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      if (item.screen === 'employer-post' && !isProfileComplete(userProfile)) {
                        showToast(
                          language === 'uz'
                            ? "Iltimos, e'lon berishdan oldin profilingizni to'liq to'ldiring (kompaniya nomi, telefon, manzil, email, haqida)."
                            : language === 'ru'
                            ? "Пожалуйста, полностью заполните профиль перед публикацией (название компании, телефон, адрес, email, о компании)."
                            : "Please complete your profile before posting a job (company name, phone, address, email, about)."
                        );
                        setCurrentScreen('employer-profile');
                        return;
                      }
                      requireAuth(item.screen);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-colors duration-200 cursor-pointer ${
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
                  </motion.button>
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
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ x: 2 }}
                  onClick={() => setCurrentScreen(isEmployer ? 'employer-profile' : 'profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-colors duration-200 cursor-pointer ${
                    currentScreen === 'profile' || currentScreen === 'employer-profile' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="stroke-[2.2]" />
                    <span>{t.profile}</span>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ x: 2 }}
                  onClick={() => onOpenModal?.('auth')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-extrabold text-[13px] bg-brand-primary text-white hover:bg-brand-primary/95 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="stroke-[2.2]" />
                    <span>{t.login}</span>
                  </div>
                  <ChevronRight size={16} />
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 2 }}
                onClick={() => {
                  useUIStore.getState().setActiveSettingsTab('settings');
                  if (onOpenModal) onOpenModal('settings');
                  else useUIStore.getState().setActiveModal('settings');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-colors duration-200 cursor-pointer ${
                  (activeModal === 'settings' && (activeSettingsTab === 'settings' || activeSettingsTab === 'security')) || currentScreen === 'settings' || currentScreen === 'security' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className="stroke-[2.2]" />
                  <span>{t.settings}</span>
                </div>
              </motion.button>

              {isAdmin && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ x: 2 }}
                  onClick={() => setCurrentScreen('admin')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-colors duration-200 cursor-pointer ${
                    currentScreen === 'admin' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="stroke-[2.2]" />
                    <span>{t.adminPanel}</span>
                  </div>
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 2 }}
                onClick={() => {
                  useUIStore.getState().setActiveSettingsTab('help');
                  if (onOpenModal) onOpenModal('help');
                  else useUIStore.getState().setActiveModal('settings');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-[13px] transition-colors duration-200 cursor-pointer ${
                  (activeModal === 'settings' && activeSettingsTab !== 'settings' && activeSettingsTab !== 'security') || ['help', 'faq', 'guide', 'privacy', 'terms', 'support-chat'].includes(currentScreen) ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/15' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="stroke-[2.2]" />
                  <span>{t.help}</span>
                </div>
              </motion.button>
            </nav>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60"
             aria-label={t.logout}>
<LogOut size={16} />
              <span>{t.logout}</span>
            </button>
          )}

          <div className="text-center pt-1">
            <p className="text-[10px] font-bold text-brand-primary">{t.brandCountry}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

