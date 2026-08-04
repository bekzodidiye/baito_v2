import { useState, useCallback } from 'react';
import { safeGetItem, safeSetItem } from './utils';
import { UserProfile, ScreenType } from './types';
import { useNavigate } from 'react-router-dom';

export function useAuthState() {
  const navigate = useNavigate();
  
  const [language, setLanguageState] = useState<'uz' | 'ru' | 'en'>(() => {
    const cached = safeGetItem('baito_language');
    return (cached as 'uz' | 'ru' | 'en') || 'uz';
  });

  const setLanguage = (lang: 'uz' | 'ru' | 'en') => {
    setLanguageState(lang);
    safeSetItem('baito_language', lang);
  };

  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(() => {
    const cached = safeGetItem('baito_is_logged_in');
    return cached === 'true';
  });

  const setIsLoggedIn = (loggedIn: boolean) => {
    setIsLoggedInState(loggedIn);
    safeSetItem('baito_is_logged_in', String(loggedIn));
  };

  const [userProfile, setUserProfileState] = useState<UserProfile | null>(() => {
    const cached = safeGetItem('baito_user_profile');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const setUserProfile = (profile: UserProfile | null) => {
    setUserProfileState(profile);
    if (profile) {
      safeSetItem('baito_user_profile', JSON.stringify(profile));
    } else {
      try {
        localStorage.removeItem('baito_user_profile');
      } catch (e) {}
    }
  };

  // Keep pending redirect logic
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
    if (!isLoggedIn) {
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
  }, [isLoggedIn, navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('baito_token');
    localStorage.removeItem('baito_user_profile');
    localStorage.removeItem('baito_is_logged_in');
    setUserProfileState(null);
    setIsLoggedInState(false);
    navigate('/');
  }, [navigate]);

  return {
    language, setLanguage,
    isLoggedIn, setIsLoggedIn,
    userProfile, setUserProfile,
    executePendingRedirect, requireAuth,
    logout
  };
}
