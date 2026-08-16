import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { AppContextType, UserProfile, ScreenType } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { safeGetItem } from './utils';
import { fetchUserProfileApi, logoutApi } from '../api/queries';

export * from './types';
export { getJobDates, safeGetItem, safeSetItem } from './utils';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const uiState = useUIStore();
  const authState = useAuthStore();
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
    if (!authState.isLoggedIn) {
      setPendingRedirect(() => () => {
        if (action) action();
        else if (targetScreen) {
          if (targetScreen === 'landing' || targetScreen === 'jobs') navigate('/jobs');
          else navigate(`/${targetScreen}`);
        }
      });
      navigate('/login');
      return false;
    }

    if (targetScreen) {
      if (targetScreen === 'landing' || targetScreen === 'jobs') navigate('/jobs');
      else navigate(`/${targetScreen}`);
    } else if (action) {
      action();
    }
    return true;
  }, [authState.isLoggedIn, navigate]);

  const logout = useCallback(async () => {
    await logoutApi();
    authState.clearSession();
    queryClient.clear();
    navigate('/login');
  }, [authState, navigate, queryClient]);

  useEffect(() => {
    if (authState.isLoggedIn) {
      fetchUserProfileApi()
        .then(data => {
            if (data) {
              const cached = safeGetItem('baito_user_profile');
              let currentRole = (data as any).role || 'worker';
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  if (parsed.selectedRole) {
                    currentRole = parsed.selectedRole;
                  }
                } catch(e) {}
              }
              
              let fName = '';
              let lName = '';
              if (data.name) {
                const [first, ...rest] = data.name.trim().split(/\s+/);
                fName = first || '';
                lName = rest.join(' ') || '';
              }

              authState.setUserProfile({
                id: data.id || '',
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
  }, [authState.isLoggedIn, authState.setUserProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      authState.clearSession();
      queryClient.clear();
      navigate('/login');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [authState, navigate, queryClient]);

  const value: AppContextType = useMemo(() => ({
    ...uiState,
    ...authState,
    executePendingRedirect,
    requireAuth,
    logout
  }), [uiState, authState, executePendingRedirect, requireAuth, logout]);

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
