import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenType } from '../context/types';

export function useCurrentScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const getScreenFromPath = (path: string): ScreenType => {
    const p = path.slice(1).split('/')[0];
    if (!p) return 'jobs';
    if (p === 'jobs') return 'jobs';
    if (p === 'chats') return 'chat';
    if (['calendar', 'messages', 'jobs', 'chat', 'notifications', 'profile', 'reviews', 'applications', 'verification', 'payments', 'login', 'register', 'settings', 'security', 'help', 'faq', 'guide', 'terms', 'support-chat', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'admin'].includes(p)) {
      return p as ScreenType;
    }
    return 'jobs';
  };

  const currentScreen = getScreenFromPath(location.pathname);
  const setCurrentScreen = (screen: ScreenType) => {
    if (screen === currentScreen) return; // Prevent loop
    if (screen === 'landing' || screen === 'jobs') navigate('/jobs');
    else navigate(`/${screen}`);
  };

  return { currentScreen, setCurrentScreen };
}
