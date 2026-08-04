import { useState, useEffect } from 'react';
import { ScreenType } from './types';
import { safeGetItem, safeSetItem } from './utils';
import { useNavigate, useLocation } from 'react-router-dom';

export function useUIState() {
  const location = useLocation();
  const navigate = useNavigate();

  const getScreenFromPath = (path: string): ScreenType => {
    const p = path.slice(1).split('/')[0];
    if (!p) return 'landing';
    if (p === 'qidiruv' || p === 'jobs') return 'xarita';
    if (p === 'chats') return 'chat';
    if (['landing', 'kalendar', 'xabarlar', 'xarita', 'chat', 'bildirishnomalar', 'profil', 'yakunlash', 'login', 'register', 'sozlamalar', 'xavfsizlik', 'yordam', 'faq', 'qollanma', 'shartlar', 'support-chat', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'admin'].includes(p)) {
      return p as ScreenType;
    }
    return 'landing';
  };

  const currentScreen = getScreenFromPath(location.pathname);
  const setCurrentScreen = (screen: ScreenType) => {
    if (screen === 'landing') navigate('/');
    else navigate(`/${screen}`);
  };

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [employerSelectedChatId, setEmployerSelectedChatId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('Barchasi');
  const [filterType, setFilterType] = useState('Barchasi');
  const [sortBy, setSortBy] = useState<'yangilari' | 'maosh'>('yangilari');
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [mapFocusedJobId, setMapFocusedJobId] = useState<string | null>(null);
  const [messagesSearchOpen, setMessagesSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const handleGlobalToast = (e: any) => {
      setToastMessage(e.detail);
      setTimeout(() => setToastMessage(null), 3000);
    };
    window.addEventListener('global-toast', handleGlobalToast);
    return () => window.removeEventListener('global-toast', handleGlobalToast);
  }, []);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(2);
  const [activeCalendarFilter, setActiveCalendarFilter] = useState<'all' | 'applied' | 'confirmed' | 'todo' | 'completed'>('all');
  const [activeCalendarDay, setActiveCalendarDay] = useState<string>(new Date().toLocaleDateString('en-CA'));
  
  const [hasSeenTour, setHasSeenTourState] = useState<boolean>(() => {
    return safeGetItem('baito_has_seen_tour') === 'true';
  });

  const setHasSeenTour = (seen: boolean) => {
    setHasSeenTourState(seen);
    safeSetItem('baito_has_seen_tour', String(seen));
  };

  return {
    currentScreen, setCurrentScreen,
    selectedChatId, setSelectedChatId,
    employerSelectedChatId, setEmployerSelectedChatId,
    drawerOpen, setDrawerOpen,
    searchTerm, setSearchTerm,
    filterLocation, setFilterLocation,
    filterType, setFilterType,
    sortBy, setSortBy,
    showRegionSelector, setShowRegionSelector,
    mapFocusedJobId, setMapFocusedJobId,
    messagesSearchOpen, setMessagesSearchOpen,
    toastMessage, setToastMessage,
    unreadNotificationsCount, setUnreadNotificationsCount,
    activeCalendarFilter, setActiveCalendarFilter,
    activeCalendarDay, setActiveCalendarDay,
    hasSeenTour, setHasSeenTour
  };
}
