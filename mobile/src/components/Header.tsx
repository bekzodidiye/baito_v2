import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Map, Bell, Search, LayoutList, ArrowLeftRight } from 'lucide-react';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

interface HeaderProps {
  onOpenModal?: (type: 'profile' | 'settings' | 'help' | 'auth') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenModal }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { 
    setDrawerOpen, 
    unreadNotificationsCount, 
    messagesSearchOpen, 
    setMessagesSearchOpen, 
    language, 
    isLoggedIn, 
    userProfile, 
    setUserProfile, 
    employerSelectedChatId, 
    selectedChatId 
  } = useApp();
  const t = translations[language];
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  const handleRoleToggle = () => {
    if (!userProfile) return;
    const newRole = userProfile.selectedRole === 'employer' ? 'worker' : 'employer';
    setUserProfile({
      ...userProfile,
      selectedRole: newRole
    });
    if (newRole === 'employer') {
      setCurrentScreen('employer-dashboard');
    } else {
      setCurrentScreen('jobs');
    }
  };

  const getMobileTitle = () => {
    if (isEmployer) {
      if (currentScreen === 'employer-applicants') return language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants";
      if (currentScreen === 'employer-chats') return language === 'uz' ? "Suhbatlar" : language === 'ru' ? "Чаты" : "Chats";
      if (currentScreen === 'employer-post') return language === 'uz' ? "E'lon joylash" : language === 'ru' ? "Новое объявление" : "Post Job";
      if (currentScreen === 'employer-profile') return language === 'uz' ? "Profil" : language === 'ru' ? "Профиль" : "Profile";
      if (currentScreen === 'employer-dashboard') return language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard";
      if (currentScreen === 'employer-analytics') return language === 'uz' ? "Analitika" : language === 'ru' ? "Аналитика" : "Analytics";
      return language === 'uz' ? "E'lonlarim" : language === 'ru' ? "Мои объявления" : "My Jobs";
    }

    switch (currentScreen) {
      case 'calendar':
        return t.calendar;
      case 'employer-chats':
      case 'messages':
        return t.messages;
      case 'applications':
        return language === 'uz' ? "Arizalarim" : language === 'ru' ? "Мои заявки" : "Applications";
      case 'profile':
        return language === 'uz' ? "Mening profilim" : language === 'ru' ? "Мой профиль" : "Profile";
      case 'jobs':
      default:
        return t.jobSearch;
    }
  };

  const renderMobileActions = () => {
    return (
      <div className="flex items-center gap-1.5">
        {isLoggedIn && (
          <button
            onClick={handleRoleToggle}
            className="flex items-center gap-1 px-2.5 py-1 bg-brand-surface-low hover:bg-brand-primary hover:text-white text-brand-primary border border-brand-outline-variant/40 rounded-full text-[10px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Rolni almashtirish"
          >
            <ArrowLeftRight size={11} className="stroke-[2.5]" />
            <span>{isEmployer ? 'Ishchi' : 'Ish beruvchi'}</span>
          </button>
        )}

        {currentScreen === 'calendar' ? (
          <div 
            onClick={() => setCurrentScreen('notifications')}
            className="relative p-1.5 cursor-pointer text-brand-primary hover:bg-brand-surface-low rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        ) : (currentScreen === 'messages' || currentScreen === 'employer-chats') ? (
          <button 
            onClick={() => setMessagesSearchOpen(!messagesSearchOpen)}
            className={`p-1.5 cursor-pointer rounded-full transition-all duration-300 ${
              messagesSearchOpen 
                ? 'text-white bg-brand-primary shadow-xs scale-105' 
                : 'text-brand-primary hover:bg-brand-surface-low'
            }`}
          >
            <Search size={20} />
          </button>
        ) : (
          <button
            onClick={() => setCurrentScreen('notifications')}
            className="relative p-1.5 cursor-pointer text-brand-primary hover:bg-brand-surface-low rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      {currentScreen !== 'chat' && !((currentScreen === 'messages' || currentScreen === 'employer-chats') && (selectedChatId || employerSelectedChatId)) && (
        <header className="flex md:hidden justify-between items-center px-3.5 h-14 w-full z-50 bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.05)] fixed top-0 left-0 border-b border-slate-100/80">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center p-2 rounded-full hover:bg-brand-surface-low transition-colors text-brand-primary cursor-pointer active:scale-95"
            aria-label="Menyuni ochish"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-display text-base font-bold text-brand-primary truncate flex-1 text-center px-2">
            {getMobileTitle()}
          </h1>
          {renderMobileActions()}
        </header>
      )}
    </>
  );
};
