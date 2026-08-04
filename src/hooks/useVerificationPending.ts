import { useApp } from '../context/AppContext';
import { getTranslations } from '../components/login/VerificationPendingScreen.utils';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

export const useVerificationPending = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, userProfile } = useApp();
  const { t, stepT } = getTranslations(language);

  const handleDashboardClick = () => {
    if (userProfile?.selectedRole === 'employer') {
      setCurrentScreen('employer-dashboard');
    } else {
      setCurrentScreen('xarita');
    }
  };

  const handleSupportClick = () => {
    showToast(t.supportToast);
  };

  return {
    language,
    setCurrentScreen,
    userProfile,
    handleDashboardClick,
    t,
    stepT,
    handleSupportClick
  };
};
