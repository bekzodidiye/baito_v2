import { useApp } from '../context/AppContext';
import { getTranslations } from '../components/login/VerificationPendingScreen.utils';

export const useVerificationPending = () => {
  const { language, setCurrentScreen, setToastMessage, userProfile } = useApp();
  const { t, stepT } = getTranslations(language);

  const handleDashboardClick = () => {
    if (userProfile?.selectedRole === 'employer') {
      setCurrentScreen('employer-dashboard');
    } else {
      setCurrentScreen('xarita');
    }
  };

  const handleSupportClick = () => {
    setToastMessage(t.supportToast);
    setTimeout(() => setToastMessage(null), 3000);
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
