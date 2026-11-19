import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, ClipboardList, Settings, HelpCircle, LogOut, LayoutDashboard, Briefcase, Users, MessageCircle, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { useSidebarBadges } from '../hooks/useSidebarBadges';
import { LanguageSelector } from './LanguageSelector';
import { DrawerMenuItem } from './DrawerMenuItem';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFocusTrap } from './common/useFocusTrap';

interface DrawerProps {
  onOpenModal: (type: 'profile' | 'settings' | 'help' | 'auth') => void;
}

export const Drawer: React.FC<DrawerProps> = ({ onOpenModal }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const drawerOpen = useUIStore(s => s.drawerOpen);
    const setDrawerOpen = useUIStore(s => s.setDrawerOpen);
    const setActiveCalendarFilter = useUIStore(s => s.setActiveCalendarFilter);
    const language = useAuthStore(s => s.language);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const logout = useApp().logout;
    const userProfile = useAuthStore(s => s.userProfile);
  const t = translations[language];
  const { pendingApplications, unreadMessages } = useSidebarBadges();
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';
  const isAdmin = isLoggedIn && userProfile?.selectedRole === 'admin';

  const drawerRef = useFocusTrap<HTMLElement>(drawerOpen, () => setDrawerOpen(false));

  const handleMeningArizalarim = () => {
    setCurrentScreen('calendar');
    setActiveCalendarFilter('applied');
    setDrawerOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  const handleModalOpen = (type: 'profile' | 'settings' | 'help' | 'auth') => {
    setDrawerOpen(false);
    onOpenModal(type);
  };

  const menuItems = [];

  if (!isLoggedIn) {
    menuItems.push({
      id: 'login',
      label: t.login,
      icon: User,
      action: () => handleModalOpen('auth'),
      active: false,
      highlight: true,
    });
  } else {
    menuItems.push(
      {
        id: 'profile',
        label: t.profile,
        icon: User,
        action: () => {
          setDrawerOpen(false);
          setCurrentScreen(isEmployer ? 'employer-profile' : 'profile');
        },
        active: currentScreen === 'profile' || currentScreen === 'employer-profile',
      }
    );
    
    if (!isEmployer) {
      menuItems.push({
        id: 'applications',
        label: t.myApplications,
        icon: ClipboardList,
        action: handleMeningArizalarim,
        active: currentScreen === 'calendar',
      });
    }
    if (isEmployer) {
      menuItems.push(
        {
          id: 'dashboard',
          label: language === 'uz' ? 'Boshqaruv paneli' : language === 'ru' ? 'Панель управления' : 'Dashboard',
          icon: LayoutDashboard,
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-dashboard'); },
          active: currentScreen === 'employer-dashboard',
        },
        {
          id: 'jobs',
          label: language === 'uz' ? 'E\'lonlarim' : language === 'ru' ? 'Мои объявления' : 'My Jobs',
          icon: Briefcase,
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-jobs'); },
          active: currentScreen === 'employer-jobs',
        },
        {
          id: 'applicants',
          label: language === 'uz' ? 'Arizalar' : language === 'ru' ? 'Заявки' : 'Applicants',
          icon: Users,
          badge: pendingApplications,
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-applicants'); },
          active: currentScreen === 'employer-applicants',
        },
        {
          id: 'chats',
          label: language === 'uz' ? 'Xabarlar' : language === 'ru' ? 'Сообщения' : 'Messages',
          icon: MessageCircle,
          badge: unreadMessages,
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-chats'); },
          active: currentScreen === 'employer-chats',
        }
      );
    }
  }

  // Offered to everyone, so a worker could open it and be bounced straight
  // back by the route guard with nothing said.
  if (isAdmin) {
    menuItems.push({
      id: 'admin',
      label: language === 'uz' ? 'Admin Panel' : language === 'ru' ? 'Админ панель' : 'Admin Panel',
      icon: ShieldCheck,
      action: () => { setDrawerOpen(false); setCurrentScreen('admin'); },
      active: currentScreen === 'admin',
    });
  }

  menuItems.push(
    {
      id: 'settings',
      label: t.settings,
      icon: Settings,
      action: () => {
        useUIStore.getState().setActiveSettingsTab('settings');
        handleModalOpen('settings');
      },
      active: currentScreen === 'settings',
    },
    {
      id: 'help',
      label: t.help,
      icon: HelpCircle,
      action: () => {
        useUIStore.getState().setActiveSettingsTab('help');
        handleModalOpen('settings');
      },
      active: false,
    }
  );

  if (isLoggedIn) {
    menuItems.push({
      id: 'logout',
      label: t.logout,
      icon: LogOut,
      action: () => {
        logout();
        setDrawerOpen(false);
        showToast(t.logoutSuccess);
      },
      active: false,
      isDanger: true,
    });
  }

  return (
    <AnimatePresence mode="wait">
      {drawerOpen && (
        <aside key="mobile-drawer-root" className="fixed inset-0 z-[5000] md:hidden flex pointer-events-none">
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer pointer-events-auto"
          />

          {/* Drawer content */}
          <motion.nav
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.sidebarMenu}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
            className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col justify-between shadow-[10px_0_40px_rgba(0,0,0,0.12)] border-r border-slate-100 overflow-hidden pointer-events-auto"
          >
            {/* Top Header */}
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <Logo sizeClassName="text-[17px]" />
                <div className="flex items-center gap-1.5">
                  <LanguageSelector align="right" />
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label={t.close}
                    className="p-1.5 rounded-full hover:bg-slate-200/65 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border-0 bg-transparent active:scale-95"
                    type="button"
                  >
                    <X size={18} aria-hidden="true" className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Navigation list */}
              <div className="px-3 pt-4 flex flex-col gap-1">
                {menuItems.map((item, index) => (
                  <DrawerMenuItem key={item.id} item={item} index={index} />
                ))}
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/30 text-center flex flex-col gap-1">
              <p className="text-[11px] font-bold text-brand-primary select-none">{t.brandCountry}</p>
              <p className="text-[9px] font-medium text-slate-400 select-none tracking-wider">v{__APP_VERSION__} • Premium Design</p>
            </div>
          </motion.nav>
        </aside>
      )}
    </AnimatePresence>
  );
};

