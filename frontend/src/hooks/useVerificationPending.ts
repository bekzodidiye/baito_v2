import { getTranslations } from '../components/login/VerificationPendingScreen.utils';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { useAuthStore } from "../store/useAuthStore";

export const useVerificationPending = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
    const userProfile = useAuthStore(s => s.userProfile);
  const { t, stepT } = getTranslations(language);

  const handleDashboardClick = () => {
    if (userProfile?.selectedRole === 'employer') {
      setCurrentScreen('employer-dashboard');
    } else {
      setCurrentScreen('jobs');
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
