import React from 'react';
import { useApp } from '../context/AppContext';
import { X, User, ClipboardList, Settings, HelpCircle, ChevronRight, LogOut, LayoutDashboard, Briefcase, Users, MessageSquare, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { LanguageSelector } from './LanguageSelector';

interface DrawerProps {
  onOpenModal: (type: 'profile' | 'settings' | 'help' | 'auth') => void;
}

export const Drawer: React.FC<DrawerProps> = ({ onOpenModal }) => {
  const { drawerOpen, setDrawerOpen, currentScreen, setCurrentScreen, setActiveCalendarFilter, language, isLoggedIn, setIsLoggedIn, setToastMessage, userProfile } = useApp();
  const t = translations[language];
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  const handleMeningArizalarim = () => {
    setCurrentScreen('kalendar');
    setActiveCalendarFilter('applied');
    setDrawerOpen(false);
  };

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
          setCurrentScreen(isEmployer ? 'employer-profile' : 'profil');
        },
        active: currentScreen === 'profil' || currentScreen === 'employer-profile',
      }
    );
    
    if (!isEmployer) {
      menuItems.push({
        id: 'applications',
        label: t.myApplications,
        icon: ClipboardList,
        action: handleMeningArizalarim,
        active: currentScreen === 'kalendar',
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
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-applicants'); },
          active: currentScreen === 'employer-applicants',
        },
        {
          id: 'chats',
          label: language === 'uz' ? 'Suhbatlar' : language === 'ru' ? 'Чаты' : 'Chats',
          icon: MessageSquare,
          action: () => { setDrawerOpen(false); setCurrentScreen('employer-chats'); },
          active: currentScreen === 'employer-chats',
        }
      );
    }
  }

  menuItems.push(
    {
      id: 'admin',
      label: language === 'uz' ? 'Admin Panel' : language === 'ru' ? 'Админ панель' : 'Admin Panel',
      icon: ShieldCheck,
      action: () => { setDrawerOpen(false); setCurrentScreen('admin'); },
      active: currentScreen === 'admin',
    },
    {
      id: 'settings',
      label: t.settings,
      icon: Settings,
      action: () => { setDrawerOpen(false); setCurrentScreen('sozlamalar'); },
      active: currentScreen === 'sozlamalar',
    },
    {
      id: 'help',
      label: t.help,
      icon: HelpCircle,
      action: () => handleModalOpen('help'),
      active: false,
    }
  );

  if (isLoggedIn) {
    menuItems.push({
      id: 'logout',
      label: t.logout,
      icon: LogOut,
      action: () => {
        setIsLoggedIn(false);
        setDrawerOpen(false);
        setToastMessage(t.logoutSuccess);
        setTimeout(() => setToastMessage(null), 3000);
      },
      active: false,
      isDanger: true,
    });
  }

  return (
    <AnimatePresence>
      {drawerOpen && (
        <aside className="fixed inset-0 z-[5000] md:hidden flex">
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer content */}
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col justify-between shadow-[10px_0_40px_rgba(0,0,0,0.12)] border-r border-slate-100 overflow-hidden"
          >
            {/* Top Header */}
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <Logo sizeClassName="text-[17px]" />
                <div className="flex items-center gap-1.5">
                  <LanguageSelector align="right" />
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-full hover:bg-slate-200/65 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border-0 bg-transparent active:scale-95"
                    type="button"
                  >
                    <X size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Navigation list */}
              <div className="px-3 pt-4 flex flex-col gap-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isHighlight = 'highlight' in item && item.highlight;
                  const isDanger = 'isDanger' in item && item.isDanger;
                  
                  let buttonClass = '';
                  let iconWrapperClass = '';
                  
                  if (isHighlight) {
                    buttonClass = 'bg-brand-primary text-white hover:bg-brand-primary/95 shadow-[0_4px_12px_rgba(0,6,102,0.12)] my-1';
                    iconWrapperClass = 'bg-white/20 text-white';
                  } else if (isDanger) {
                    buttonClass = 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 mt-2 border border-dashed border-rose-200/50';
                    iconWrapperClass = 'bg-rose-50 text-rose-500 group-hover:bg-rose-100 group-hover:text-rose-600';
                  } else if (item.active) {
                    buttonClass = 'bg-brand-primary/5 text-brand-primary';
                    iconWrapperClass = 'bg-brand-primary/10 text-brand-primary';
                  } else {
                    buttonClass = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
                    iconWrapperClass = 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700';
                  }

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + index * 0.04, duration: 0.2 }}
                      onClick={item.action}
                      className={`group flex items-center justify-between w-full p-3 rounded-xl font-bold text-xs text-left transition-all cursor-pointer border-0 relative ${buttonClass}`}
                      type="button"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${iconWrapperClass}`}>
                          <Icon size={16} className="stroke-[2.2]" />
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight 
                        size={14} 
                        className={`transition-all duration-200 ${
                          isHighlight
                            ? 'text-white/80 group-hover:translate-x-0.5'
                            : isDanger
                            ? 'text-rose-300 group-hover:text-rose-500 group-hover:translate-x-0.5'
                            : item.active 
                            ? 'text-brand-primary translate-x-0' 
                            : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5'
                        }`} 
                      />
                      
                      {!isHighlight && !isDanger && item.active && (
                        <span className="absolute left-0 top-3 bottom-3 w-1 bg-brand-primary rounded-r-md" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/30 text-center flex flex-col gap-1">
              <p className="text-[11px] font-bold text-brand-primary select-none">Baito Uzbekistan</p>
              <p className="text-[9px] font-medium text-slate-400 select-none tracking-wider">v1.1.0 • Premium Design</p>
            </div>
          </motion.nav>
        </aside>
      )}
    </AnimatePresence>
  );
};

