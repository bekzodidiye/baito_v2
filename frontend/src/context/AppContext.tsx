import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { AppContextType, ScreenType } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { fetchUserProfileApi, logoutApi } from '../api/queries';

export * from './types';
export { getJobDates, safeGetItem, safeSetItem } from './utils';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setUserProfile = useAuthStore(s => s.setUserProfile);
  const clearSession = useAuthStore(s => s.clearSession);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pendingRedirect, setPendingRedirect] = useState<(() => void) | null>(null);

  const executePendingRedirect = useCallback(() => {
    if (pendingRedirect) {
      pendingRedirect();
      setPendingRedirect(null);
      return true;
    }
    return false;
  }, [pendingRedirect]);

  const requireAuth = useCallback((targetScreen?: ScreenType, action?: () => void) => {
    if (!useAuthStore.getState().isLoggedIn) {
      setPendingRedirect(() => () => {
        if (action) action();
        else if (targetScreen) {
          if (targetScreen === 'landing') navigate('/');
          else navigate(`/${targetScreen}`);
        }
      });
      navigate('/');
      return false;
    }

    if (targetScreen) {
      if (targetScreen === 'landing') navigate('/');
      else navigate(`/${targetScreen}`);
    } else if (action) {
      action();
    }
    return true;
  }, [navigate]);

  const logout = useCallback(async () => {
    await logoutApi();
    clearSession();
    queryClient.clear();
    navigate('/');
  }, [clearSession, navigate, queryClient]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserProfileApi()
        .then(data => {
            if (data) {
              let currentRole = (data as any).role || 'worker';
              
              let fName = '';
              let lName = '';
              if (data.name) {
                const [first, ...rest] = data.name.trim().split(/\s+/);
                fName = first || '';
                lName = rest.join(' ') || '';
              }

              setUserProfile({
                id: data.id || '',
                uid: data.uid || data.id || '',
                firstName: fName,
                lastName: lName,
                selectedRole: currentRole as 'worker' | 'employer' | 'admin',
                phone: data.phone || '',
                profileImage: data.avatarUrl || null,
                email: data.email || '',
                gender: data.gender || '',
                birthDate: data.birthDate || '',
                region: data.region || '',
                profession: data.category || '',
                aboutMe: data.bio || '',
                skills: Array.isArray(data.skills) ? data.skills : (data.skills ? [data.skills] : []),
                passportSeries: data.passportSeries || '',
                pinfl: data.passportJshshir || '',
                docFileName1: data.passportDocFront || '',
                docFileName2: data.passportDocBack || '',
                docFileName3: data.selfieWithDoc || '',
                isVerified: data.isVerified || false,
                rating: data.rating || 0,
                completedJobsCount: data.completedJobsCount || 0,
                notify_new_jobs: data.notify_new_jobs,
                notify_interviews: data.notify_interviews,
                notify_general: data.notify_general,
                two_factor_enabled: data.two_factor_enabled,
                biometrics_enabled: data.biometrics_enabled,
              });
            }
          })
          .catch(() => {});
    }
  }, [isLoggedIn, setUserProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      queryClient.clear();
      navigate('/login');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearSession, navigate, queryClient]);

  // Decoupled context value: uses getters delegating to Zustand stores so AppProvider
  // NEVER re-renders when UI store values (like filterLocation, searchTerm) change.
  const value: AppContextType = useMemo(() => ({
    get selectedChatId() { return useUIStore.getState().selectedChatId; },
    setSelectedChatId: (id: string | null) => useUIStore.getState().setSelectedChatId(id),
    get employerSelectedChatId() { return useUIStore.getState().employerSelectedChatId; },
    setEmployerSelectedChatId: (id: string | null) => useUIStore.getState().setEmployerSelectedChatId(id),
    get drawerOpen() { return useUIStore.getState().drawerOpen; },
    setDrawerOpen: (open: boolean) => useUIStore.getState().setDrawerOpen(open),
    get searchTerm() { return useUIStore.getState().searchTerm; },
    setSearchTerm: (term: string) => useUIStore.getState().setSearchTerm(term),
    get filterLocation() { return useUIStore.getState().filterLocation; },
    setFilterLocation: (loc: string) => useUIStore.getState().setFilterLocation(loc),
    get filterType() { return useUIStore.getState().filterType; },
    setFilterType: (type: string) => useUIStore.getState().setFilterType(type),
    get filterCategory() { return useUIStore.getState().filterCategory; },
    setFilterCategory: (cat: string) => useUIStore.getState().setFilterCategory(cat),
    get sortBy() { return useUIStore.getState().sortBy; },
    setSortBy: (sort: 'yangilari' | 'maosh') => useUIStore.getState().setSortBy(sort),
    get unreadNotificationsCount() { return useUIStore.getState().unreadNotificationsCount; },
    setUnreadNotificationsCount: (count: number) => useUIStore.getState().setUnreadNotificationsCount(count),
    get activeCalendarFilter() { return useUIStore.getState().activeCalendarFilter; },
    setActiveCalendarFilter: (f: any) => useUIStore.getState().setActiveCalendarFilter(f),
    get activeCalendarDay() { return useUIStore.getState().activeCalendarDay; },
    setActiveCalendarDay: (d: string) => useUIStore.getState().setActiveCalendarDay(d),
    get showRegionSelector() { return useUIStore.getState().showRegionSelector; },
    setShowRegionSelector: (show: boolean) => useUIStore.getState().setShowRegionSelector(show),
    get mapFocusedJobId() { return useUIStore.getState().mapFocusedJobId; },
    setMapFocusedJobId: (id: string | null) => useUIStore.getState().setMapFocusedJobId(id),
    get messagesSearchOpen() { return useUIStore.getState().messagesSearchOpen; },
    setMessagesSearchOpen: (open: boolean) => useUIStore.getState().setMessagesSearchOpen(open),
    get hasSeenTour() { return useUIStore.getState().hasSeenTour; },
    setHasSeenTour: (seen: boolean) => useUIStore.getState().setHasSeenTour(seen),
    get jobsView() { return useUIStore.getState().jobsView; },
    setJobsView: (v: 'map' | 'list') => useUIStore.getState().setJobsView(v),

    get language() { return useAuthStore.getState().language; },
    setLanguage: (lang: 'uz' | 'ru' | 'en') => useAuthStore.getState().setLanguage(lang),
    get isLoggedIn() { return useAuthStore.getState().isLoggedIn; },
    setIsLoggedIn: (inVal: boolean) => useAuthStore.getState().setIsLoggedIn(inVal),
    get userProfile() { return useAuthStore.getState().userProfile; },
    setUserProfile: (prof: any) => useAuthStore.getState().setUserProfile(prof),

    executePendingRedirect,
    requireAuth,
    logout
  }), [executePendingRedirect, requireAuth, logout]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
