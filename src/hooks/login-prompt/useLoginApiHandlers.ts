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

      await loginApi(state.regPhone, state.regPassword);

      const { apiClient } = await import('../../api/client');
      
      const extendedPayload = {
        name: state.selectedRole === 'worker' ? `${state.firstName} ${state.lastName}`.trim() : state.companyName,
        email: state.email || undefined,
        gender: state.gender || undefined,
        birthDate: state.birthDay && state.birthMonth && state.birthYear ? `${state.birthYear}-${state.birthMonth.padStart(2, '0')}-${state.birthDay.padStart(2, '0')}` : undefined,
        passportSeries: state.passportSeries && state.passportNumber ? `${state.passportSeries} ${state.passportNumber}` : undefined,
        passportJshshir: state.jshshir || undefined,
        passportDocFront: state.docFileName1 || undefined,
        passportDocBack: state.docFileName2 || undefined,
        selfieWithDoc: state.docFileName3 || undefined,
        avatarUrl: state.profileImage || undefined,
      };

      try {
        await apiClient('/users/me', {
          method: 'PUT',
          body: JSON.stringify(extendedPayload)
        });
      } catch (e) {
        console.warn('Failed to save extended profile to backend', e);
      }

      const newProfile = {
        id: 'unknown',
        firstName: state.selectedRole === 'worker' ? (state.firstName || 'Ozodbek') : (state.companyName || 'Korzinka.uz'),
        lastName: state.selectedRole === 'worker' ? (state.lastName || 'Salimov') : '',
        selectedRole: state.selectedRole || 'worker',
        birthDate: state.birthDay && state.birthMonth && state.birthYear ? `${state.birthYear}-${state.birthMonth.padStart(2, '0')}-${state.birthDay.padStart(2, '0')}` : '1996-01-19',
        phone: state.regPhone || '+998 (90) 123-45-67',
        email: state.email || '',
        gender: state.gender || 'male',
        passportSeries: state.passportSeries && state.passportNumber ? `${state.passportSeries} ${state.passportNumber}` : '',
        pinfl: state.jshshir || '',
        docFileName1: state.docFileName1 || 'passport_front_scan.png',
        docFileName2: state.docFileName2 || '',
        docFileName3: state.docFileName3 || '',
        profileImage: state.profileImage || null,
        isVerified: false,
        rating: 0,
        completedJobsCount: 0,
      };
      setUserProfile(newProfile);
      setIsLoggedIn(true);
      showToast(t.finishSuccess);
      
      if (isModal && onClose) onClose();
      else {
        const redirected = executePendingRedirect();
        if (!redirected) setCurrentScreen('verification');
      }
    } catch (err: any) {
      const msg = err?.message || (language === 'uz' ? "Xatolik yuz berdi. Balki bu raqam ro'yxatdan o'tgandir?" : "Произошла ошибка при регистрации");
      showToast(msg);
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
      await loginApi(state.loginPhone, state.loginPassword);

      let profile = null;
      try {
        const me = await apiClient('/users/me');
        let fName = me.name || 'Foydalanuvchi';
        let lName = '';
        if (me.name && me.name.includes(' ')) {
          const parts = me.name.split(' ');
          fName = parts[0];
          lName = parts.slice(1).join(' ');
        }
        
        profile = {
          id: me.id || 'unknown',
          firstName: fName,
          lastName: lName,
          selectedRole: me.role || 'worker',
          phone: me.phone || state.loginPhone,
          profileImage: me.avatarUrl || null,
          email: me.email || '',
          gender: me.gender || '',
          birthDate: me.birthDate || '',
          region: me.region || '',
          profession: me.category || '',
          aboutMe: me.bio || '',
          skills: Array.isArray(me.skills) ? me.skills : (me.skills ? [me.skills] : []),
          passportSeries: me.passportSeries || '',
          pinfl: me.passportJshshir || '',
          docFileName1: me.passportDocFront || '',
          docFileName2: me.passportDocBack || '',
          docFileName3: me.selfieWithDoc || '',
          isVerified: me.isVerified || false,
          rating: me.rating || 0,
          completedJobsCount: me.completedJobsCount || 0,
        };
      } catch {
        profile = {
          id: 'unknown',
          firstName: 'Foydalanuvchi',
          lastName: '',
          selectedRole: 'worker' as const,
          phone: state.loginPhone,
          profileImage: null,
          isVerified: false,
          rating: 0,
          completedJobsCount: 0,
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
          else setCurrentScreen('jobs');
        }
      }
    } catch (err) {
      showToast(language === 'uz' ? "Telefon raqam yoki parol xato" : "Неверный телефон или пароль");
    }
  };

  return { handleFinishSubmit, handleLoginSubmit };
};
