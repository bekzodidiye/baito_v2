import { create } from 'zustand';
import { safeGetItem, safeSetItem } from '../context/utils';
import { RouteInfo, RouteStep } from '../services/routingService';

interface UIState {
  activeRoute: RouteInfo | null;
  setActiveRoute: (route: RouteInfo | null) => void;
  activeRouteStep: RouteStep | null;
  setActiveRouteStep: (step: RouteStep | null) => void;
  activeRouteMode: 'car' | 'transit' | 'walking';
  setActiveRouteMode: (mode: 'car' | 'transit' | 'walking') => void;
  isRouteLoading: boolean;
  setIsRouteLoading: (loading: boolean) => void;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  employerSelectedChatId: string | null;
  setEmployerSelectedChatId: (id: string | null) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  filterType: string;
  /** Set from the landing page's category cards, read by the search screen
   *  when it mounts. filterType was being used for this and nothing read it. */
  filterCategory: string;
  setFilterType: (type: string) => void;
  setFilterCategory: (category: string) => void;
  sortBy: 'yangilari' | 'maosh';
  setSortBy: (sort: 'yangilari' | 'maosh') => void;
  showRegionSelector: boolean;
  setShowRegionSelector: (show: boolean) => void;
  mapFocusedJobId: string | null;
  setMapFocusedJobId: (id: string | null) => void;
  messagesSearchOpen: boolean;
  setMessagesSearchOpen: (open: boolean) => void;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: (count: number) => void;
  activeCalendarFilter: 'all' | 'applied' | 'confirmed' | 'todo' | 'completed';
  setActiveCalendarFilter: (filter: 'all' | 'applied' | 'confirmed' | 'todo' | 'completed') => void;
  activeCalendarDay: string;
  setActiveCalendarDay: (day: string) => void;
  activeModal: 'profile' | 'settings' | 'help' | 'auth' | null;
  setActiveModal: (modal: 'profile' | 'settings' | 'help' | 'auth' | null) => void;
  activeSettingsTab: 'settings' | 'security' | 'help' | 'faq' | 'guide' | 'privacy' | 'terms' | 'support-chat';
  setActiveSettingsTab: (tab: 'settings' | 'security' | 'help' | 'faq' | 'guide' | 'privacy' | 'terms' | 'support-chat') => void;
  hasSeenTour: boolean;
  /** Which half of the job search the worker is looking at. The header toggles
   *  it; App decides whether to render the map or the list from it. */
  jobsView: 'map' | 'list';
  setJobsView: (view: 'map' | 'list') => void;
  setHasSeenTour: (seen: boolean) => void;
  desktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeRoute: null,
  setActiveRoute: (route) => set({ activeRoute: route, ...(route ? {} : { activeRouteStep: null }) }),
  activeRouteStep: null,
  setActiveRouteStep: (step) => set({ activeRouteStep: step }),
  activeRouteMode: 'car',
  setActiveRouteMode: (mode) => set({ activeRouteMode: mode }),
  isRouteLoading: false,
  setIsRouteLoading: (loading) => set({ isRouteLoading: loading }),
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  activeSettingsTab: 'settings',
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  selectedChatId: null,
  setSelectedChatId: (id) => set({ selectedChatId: id }),
  
  employerSelectedChatId: null,
  setEmployerSelectedChatId: (id) => set({ employerSelectedChatId: id }),
  
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  
  searchTerm: '',
  setSearchTerm: (term) => set({ searchTerm: term }),
  
  filterLocation: 'Barchasi',
  setFilterLocation: (location) => set({ filterLocation: location }),
  
  filterType: 'Barchasi',
  setFilterType: (type) => set({ filterType: type }),
  filterCategory: 'Barchasi',
  setFilterCategory: (category) => set({ filterCategory: category }),
  
  sortBy: 'yangilari',
  setSortBy: (sort) => set({ sortBy: sort }),
  
  showRegionSelector: false,
  setShowRegionSelector: (show) => set({ showRegionSelector: show }),
  
  mapFocusedJobId: null,
  setMapFocusedJobId: (id) => set({ mapFocusedJobId: id }),
  
  messagesSearchOpen: false,
  setMessagesSearchOpen: (open) => set({ messagesSearchOpen: open }),
  
  unreadNotificationsCount: 0,
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),
  
  activeCalendarFilter: 'all',
  setActiveCalendarFilter: (filter) => set({ activeCalendarFilter: filter }),
  
  activeCalendarDay: new Date().toLocaleDateString('en-CA'),
  setActiveCalendarDay: (day) => set({ activeCalendarDay: day }),
  
  jobsView: (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'list') ? 'list' : 'map',
  setJobsView: (view) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (view === 'list') {
        url.searchParams.set('view', 'list');
      } else {
        url.searchParams.delete('view');
      }
      window.history.replaceState({}, '', url.toString());
    }
    set({ jobsView: view });
  },

  hasSeenTour: safeGetItem('baito_has_seen_tour') === 'true',
  setHasSeenTour: (seen) => {
    safeSetItem('baito_has_seen_tour', String(seen));
    set({ hasSeenTour: seen });
  },

  desktopSidebarCollapsed: true,
  setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
}));

if (typeof window !== 'undefined') {
  (window as any).__BAITO_UI_STORE__ = useUIStore;
}
