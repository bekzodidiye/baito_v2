import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenType } from '../context/types';

export function useCurrentScreen() {
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
    if (screen === currentScreen) return; // Prevent loop
    if (screen === 'landing') navigate('/');
    else navigate(`/${screen}`);
  };

  return { currentScreen, setCurrentScreen };
}
