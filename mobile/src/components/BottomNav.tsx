import React from 'react';
import { useApp, ScreenType } from '../context/AppContext';
import { Calendar, Map, Mail, FileText, User } from 'lucide-react';
import { motion } from 'motion/react';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, requireAuth, selectedChatId, employerSelectedChatId, unreadNotificationsCount } = useApp();
  const t = translations[language];

  if (
    currentScreen === 'chat' || 
    ((currentScreen === 'messages' || currentScreen === 'employer-chats') && (selectedChatId || employerSelectedChatId))
  ) return null;

  const handleNavClick = (screen: ScreenType) => {
    requireAuth(screen);
  };

  const navItems = [
    { 
      id: 'jobs', 
      label: language === 'uz' ? "Ishlar" : language === 'ru' ? "Работа" : "Jobs", 
      icon: Map, 
      screen: 'jobs' as ScreenType 
    },
    { 
      id: 'applications', 
      label: language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applications", 
      icon: FileText, 
      screen: 'applications' as ScreenType 
    },
    { 
      id: 'calendar', 
      label: t.calendar, 
      icon: Calendar, 
      screen: 'calendar' as ScreenType 
    },
    { 
      id: 'messages', 
      label: t.messages, 
      icon: Mail, 
      screen: 'messages' as ScreenType 
    },
    { 
      id: 'profile', 
      label: language === 'uz' ? "Profil" : language === 'ru' ? "Профиль" : "Profile", 
      icon: User, 
      screen: 'profile' as ScreenType 
    },
  ];

  return (
    <nav 
      aria-label="Asosiy navigatsiya"
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] h-16 md:hidden border-t border-slate-100/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]"
    >
      <div className="flex justify-between items-center w-full max-w-md mx-auto px-2 h-full relative">
        {navItems.map((item) => {
          const active = currentScreen === item.id || (item.id === 'messages' && currentScreen === 'chat');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.screen)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 h-full relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 select-none active:scale-95 transition-transform"
            >
              <motion.div
                animate={{ y: active ? 2 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                className="relative w-8 h-8 flex items-center justify-center mb-0.5 rounded-full"
              >
                {/* Sliding background highlight */}
                {active && (
                  <motion.div
                    layoutId="activeTabBubble"
                    className="absolute inset-0 bg-brand-primary rounded-full shadow-[0_3px_10px_rgba(0,6,102,0.12)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                  />
                )}
                
                {/* Icon wrapper */}
                <span className="relative z-10 flex items-center justify-center">
                  <Icon 
                    size={18} 
                    className={`transition-colors duration-200 ${
                      active ? 'text-white stroke-[2.3]' : 'text-brand-text-variant/70 stroke-[1.8]'
                    }`} 
                  />
                </span>
              </motion.div>

              <span className={`text-[10px] tracking-tight transition-all duration-200 z-10 ${
                active
                  ? 'font-bold text-brand-primary'
                  : 'font-medium text-brand-text-variant/70'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
