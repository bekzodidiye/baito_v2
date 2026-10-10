import React from 'react';
import { Menu, Map, Bell, Search, LayoutList } from 'lucide-react';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";

interface HeaderProps {
  onOpenModal?: (type: 'profile' | 'settings' | 'help' | 'auth') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenModal }) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const setDrawerOpen = useUIStore(s => s.setDrawerOpen);
    const unreadNotificationsCount = useUIStore(s => s.unreadNotificationsCount);
    const messagesSearchOpen = useUIStore(s => s.messagesSearchOpen);
    const setMessagesSearchOpen = useUIStore(s => s.setMessagesSearchOpen);
    const language = useAuthStore(s => s.language);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const userProfile = useAuthStore(s => s.userProfile);
    const employerSelectedChatId = useUIStore(s => s.employerSelectedChatId);
    const selectedChatId = useUIStore(s => s.selectedChatId);
    const jobsView = useUIStore(s => s.jobsView);
    const setJobsView = useUIStore(s => s.setJobsView);
  const t = translations[language];
  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  const getMobileTitle = () => {
    if (isEmployer) {
      if (currentScreen === 'employer-applicants') return language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants";
      if (currentScreen === 'employer-chats') return language === 'uz' ? "Suhbatlar" : language === 'ru' ? "Чаты" : "Chats";
      if (currentScreen === 'employer-post') return language === 'uz' ? "E'lon joylash" : language === 'ru' ? "Новое объявление" : "Post Job";
      if (currentScreen === 'employer-profile') return language === 'uz' ? "Profil" : language === 'ru' ? "Профиль" : "Profile";
      if (currentScreen === 'employer-dashboard') return language === 'uz' ? "Boshqaruv paneli" : language === 'ru' ? "Панель управления" : "Dashboard";
      return language === 'uz' ? "E'lonlarim" : language === 'ru' ? "Мои объявления" : "My Jobs";
    }

    switch (currentScreen) {
      case 'calendar':
        return t.calendar;
      case 'employer-chats':
      case 'messages':
        return t.messages;
      case 'jobs':
      default:
        return t.jobSearch;
    }
  };

  const renderMobileActions = () => {
    switch (currentScreen) {
      case 'calendar':
        return (
          <div 
            onClick={() => setCurrentScreen('notifications')}
            className="relative w-11 h-11 flex items-center justify-center cursor-pointer text-brand-primary hover:bg-brand-surface-low rounded-full transition-colors"
          >
            <Bell size={22} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        );
      case 'employer-chats':
      case 'messages':
        return (
          <button 
            onClick={() => setMessagesSearchOpen(!messagesSearchOpen)}
            className={`p-2 cursor-pointer rounded-full transition-all duration-300 ${
              messagesSearchOpen 
                ? 'text-white bg-brand-primary shadow-sm hover:bg-brand-primary/95 scale-105' 
                : 'text-brand-primary hover:bg-brand-surface-low'
            }`}
          >
            <Search size={22} />
          </button>
        );
      case 'jobs':
        // This called setCurrentScreen('jobs') from the jobs screen, which the
        // navigation guard drops as a no-op — so the list, the search box and
        // every filter were unreachable.
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setJobsView(jobsView === 'map' ? 'list' : 'map')}
              className="w-11 h-11 flex items-center justify-center cursor-pointer text-brand-primary hover:bg-brand-surface-low rounded-full transition-colors"
              title={jobsView === 'map' ? t.listView : t.mapView}
              aria-label={jobsView === 'map' ? t.listView : t.mapView}
            >
              {jobsView === 'map' ? <LayoutList size={22} /> : <Map size={22} />}
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => setCurrentScreen('jobs')}
            className="w-11 h-11 flex items-center justify-center cursor-pointer text-brand-primary hover:bg-brand-surface-low rounded-full transition-colors"
            title={t.mapView}
          >
            <Map size={22} />
          </button>
        );
    }
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      {currentScreen !== 'chat' && currentScreen !== 'notifications' && currentScreen !== 'profile' && currentScreen !== 'reviews' && currentScreen !== 'applications' && currentScreen !== 'payments' && !((currentScreen === 'messages' || currentScreen === 'employer-chats') && (selectedChatId || employerSelectedChatId)) && (
        <header className="flex md:hidden justify-between items-center px-4 h-14 w-full z-50 bg-white shadow-[0_0_24px_rgba(0,0,0,0.08),_0_4px_12px_rgba(0,0,0,0.04)] fixed top-0 left-0">
          <button
            aria-label={t.openMenu}
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center p-2 rounded-full hover:bg-brand-surface-low transition-colors text-brand-primary cursor-pointer"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-display text-lg font-bold text-brand-primary truncate flex-1 text-center">
            {getMobileTitle()}
          </h1>
          <div className="flex items-center gap-1.5">
            {renderMobileActions()}
          </div>
        </header>
      )}
    </>
  );
};
