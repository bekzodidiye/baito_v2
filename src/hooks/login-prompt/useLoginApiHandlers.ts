import { useApp } from '../../context/AppContext';
import { LOCAL_TEXTS } from '../../components/login/LoginPromptScreen.translations';
import { showToast } from '../../utils/toast';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const useLoginApiHandlers = (state: any, isModal: boolean, onClose?: () => void) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, setIsLoggedIn, setUserProfile, executePendingRedirect } = useApp();
  const t = LOCAL_TEXTS[language as 'uz' | 'ru' | 'en'] || LOCAL_TEXTS.uz;

  const handleFinishSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!state.regPhone || !state.regPassword || !state.regConfirmPassword) {
      showToast(t.errorRequired);
      return;
    }
    if (state.regPassword !== state.regConfirmPassword) {
      showToast(t.errorPasswordMatch);
      return;
    }
    if (!state.agreeTerms) {
      showToast(t.errorTerms);
      return;
    }

    try {
      const { registerApi, loginApi } = await import('../../api/queries');
      const payload = {
        password: state.regPassword,
        name: state.selectedRole === 'worker' ? `${state.firstName} ${state.lastName}` : state.companyName,
        phone: state.regPhone,
        role: state.selectedRole || 'worker',
      };
      
      await registerApi(payload);
      
      const data = await loginApi(state.regPhone, state.regPassword);
      localStorage.setItem('baito_token', data.access_token);
      
      const newProfile = {
        id: 'unknown',
        firstName: state.selectedRole === 'worker' ? (state.firstName || 'Ozodbek') : (state.companyName || 'Korzinka.uz'),
        lastName: state.selectedRole === 'worker' ? (state.lastName || 'Salimov') : '',
        selectedRole: state.selectedRole || 'worker',
        birthDate: state.birthDay && state.birthMonth && state.birthYear ? `${state.birthDay}.${state.birthMonth}.${state.birthYear}` : '19.01.1996',
        phone: state.regPhone || '+998 (90) 123-45-67',
        docFileName1: state.docFileName1 || 'passport_front_scan.png',
        profileImage: state.profileImage || null,
      };
      setUserProfile(newProfile);
      setIsLoggedIn(true);
      showToast(t.finishSuccess);
      
      if (isModal && onClose) onClose();
      else {
        const redirected = executePendingRedirect();
        if (!redirected) setCurrentScreen('yakunlash');
      }
    } catch (err) {
      showToast(language === 'uz' ? "Xatolik yuz berdi. Balki bu raqam ro'yxatdan o'tgandir?" : "Произошла ошибка при регистрации");
    }
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!state.loginPhone || !state.loginPassword) {
      showToast(t.errorRequired);
      return;
    }

    try {
      const { loginApi } = await import('../../api/queries');
      const { apiClient } = await import('../../api/client');
      const data = await loginApi(state.loginPhone, state.loginPassword);
      
      localStorage.setItem('baito_token', data.access_token);
      
      let profile = null;
      try {
        const me = await apiClient('/users/me');
        profile = {
          id: me.id || 'unknown',
          firstName: me.name || 'Foydalanuvchi',
          lastName: '',
          selectedRole: me.role || 'worker',
          phone: me.phone || state.loginPhone,
          profileImage: me.avatarUrl || null,
        };
      } catch {
        profile = {
          id: 'unknown',
          firstName: 'Foydalanuvchi',
          lastName: '',
          selectedRole: 'worker' as const,
          phone: state.loginPhone,
          profileImage: null,
        };
      }
      
      setUserProfile(profile);
      setIsLoggedIn(true);
      showToast(language === 'uz' ? "Tizimga muvaffaqiyatli kirdingiz!" : language === 'ru' ? "Вы успешно вошли в систему!" : "Successfully logged in!");
      
      if (isModal && onClose) onClose();
      else {
        const redirected = executePendingRedirect();
        if (!redirected) {
          if (profile.selectedRole === 'admin') setCurrentScreen('admin');
          else if (profile.selectedRole === 'employer') setCurrentScreen('employer-dashboard');
          else setCurrentScreen('xarita');
        }
      }
    } catch (err) {
      showToast(language === 'uz' ? "Telefon raqam yoki parol xato" : "Неверный телефон или пароль");
    }
  };

  return { handleFinishSubmit, handleLoginSubmit };
};
