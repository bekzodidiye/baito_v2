import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenType } from '../context/types';

export function useCurrentScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const getScreenFromPath = (path: string): ScreenType => {
    const p = path.slice(1).split('/')[0];
    if (!p) return 'landing';
    if (p === 'jobs' || p === 'jobs') return 'jobs';
    if (p === 'chats') return 'chat';
    if (['landing', 'calendar', 'messages', 'jobs', 'chat', 'notifications', 'profile', 'verification', 'login', 'register', 'settings', 'security', 'help', 'faq', 'guide', 'terms', 'support-chat', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'admin'].includes(p)) {
      return p as ScreenType;
    }
    return 'landing';
  };

  const currentScreen = getScreenFromPath(location.pathname);
  const setCurrentScreen = (screen: ScreenType) => {
    if (screen === currentScreen) return; // Prevent loop
    if (screen === 'landing') navigate('/');
    else navigate(`/${screen}`);
  };

  return { currentScreen, setCurrentScreen };
}
