import { useState } from 'react';
import { safeGetItem, safeSetItem } from './utils';

export function useUIState() {
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
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
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
     unreadNotificationsCount, setUnreadNotificationsCount,
    activeCalendarFilter, setActiveCalendarFilter,
    activeCalendarDay, setActiveCalendarDay,
    hasSeenTour, setHasSeenTour
  };
}
