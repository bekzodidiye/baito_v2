import { useApp } from '../../context/AppContext';
import { LOCAL_TEXTS } from '../../components/login/LoginPromptScreen.translations';
import { useLoginApiHandlers } from './useLoginApiHandlers';
import { showToast } from '../../utils/toast';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const useLoginHandlers = (state: any, isModal: boolean, onClose?: () => void) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const t = LOCAL_TEXTS[language as 'uz' | 'ru' | 'en'] || LOCAL_TEXTS.uz;
  
  const { handleFinishSubmit, handleLoginSubmit, handleSendVerificationCode } = useLoginApiHandlers(state, isModal, onClose);

  // File picker handlers.
  //
  // Nothing is uploaded here. During registration there is no session yet, so
  // /upload answers 401; apiClient then treats that as an expired session and
  // bounces the user back to the login screen mid-signup. The files are kept
  // in state and uploaded by handleFinishSubmit once the account exists.
  const stageFile = (key: 'avatar' | 'doc1' | 'doc2' | 'doc3', file: File) => {
    state.setPendingFiles((prev: Record<string, File>) => ({ ...prev, [key]: file }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setProfileImage(URL.createObjectURL(file));
      stageFile('avatar', file);
    }
  };

  const triggerFileSelect = () => state.fileInputRef.current?.click();
  const triggerDoc1Select = () => state.doc1InputRef.current?.click();
  const triggerDoc2Select = () => state.doc2InputRef.current?.click();
  const triggerDoc3Select = () => state.doc3InputRef.current?.click();

  const handleDoc1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setDocFileName1(file.name);
      stageFile('doc1', file);
    }
  };
  const handleDoc2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setDocFileName2(file.name);
      stageFile('doc2', file);
    }
  };
  const handleDoc3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setDocFileName3(file.name);
      stageFile('doc3', file);
    }
  };

  // Demo autofill — development only. This writes plausible-looking passport
  // details that would otherwise be submitted to the verification queue.
  const triggerDemoDocsAll = () => {
    if (import.meta.env.PROD) return;
    if (state.selectedRole === 'worker') {
      state.setPassportSeries('AB');
      state.setPassportNumber('1234567');
      state.setJshshir('12345678901234');
      state.setDocFileName1('passport_front_scan.png');
      state.setDocFileName2('passport_back_scan.png');
      state.setDocFileName3('selfie_with_passport.jpg');
    } else {
      state.setCompanyName('Perfect Jobs MCHJ');
      state.setStir('123456789');
      state.setDocFileName1('company_registration_license.pdf');
      state.setDocFileName2('brand_identity_logo.png');
    }
  };

  // Flow handlers
  const handleBack = () => {
    if (state.mode === 'role-selection') {
      if (isModal && onClose) onClose();
      else {
        const hasPreselectedRole = localStorage.getItem('baito_preselected_role');
        setCurrentScreen(hasPreselectedRole ? 'landing' : 'jobs');
      }
    } else if (state.mode === 'profile-info') state.setMode('role-selection');
    else if (state.mode === 'documents') state.setMode('profile-info');
    else if (state.mode === 'finish') state.setMode('documents');
    else if (state.mode === 'login') {
      if (isModal && onClose) onClose();
      else {
        const hasPreselectedRole = localStorage.getItem('baito_preselected_role');
        setCurrentScreen(hasPreselectedRole ? 'landing' : 'jobs');
      }
    }
  };

  const handleRoleContinue = () => {
    if (state.selectedRole) state.setMode('profile-info');
  };

  const handleProfileSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state.selectedRole === 'worker') {
      if (!state.firstName || !state.lastName || !state.birthDay || !state.birthMonth || !state.birthYear || !state.gender) {
        showToast(t.errorRequired);
        return;
      }
    } else {
      if (!state.companyName || !state.industry || !state.location) {
        showToast(t.errorRequired);
        return;
      }
    }
    state.setMode('documents');
  };

  const handleDocumentsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state.selectedRole === 'worker') {
      if (!state.passportSeries || !state.passportNumber || !state.jshshir || !state.docFileName1 || !state.docFileName2 || !state.docFileName3) {
        showToast(t.errorRequired);
        return;
      }
      if (state.jshshir.trim().length !== 14 || isNaN(Number(state.jshshir.trim()))) {
        const msg = language === 'uz' ? "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak!" : language === 'ru' ? "ПИНФЛ должен состоять из 14 цифр!" : "JSHSHIR must be exactly 14 digits!";
        (msg);
        return;
      }
    } else {
      if (!state.companyName || !state.stir || !state.docFileName1) {
        showToast(t.errorRequired);
        return;
      }
      if (state.stir.trim().length !== 9 || isNaN(Number(state.stir.trim()))) {
        const msg = language === 'uz' ? "STIR (INN) 9 ta raqamdan iborat bo'lishi kerak!" : language === 'ru' ? "ИНН должен состоять из 9 цифр!" : "STIR (INN) must be exactly 9 digits!";
        (msg);
        return;
      }
    }
    state.setMode('finish');
  };

  return {
    handlePhotoUpload,
    triggerFileSelect,
    triggerDoc1Select,
    triggerDoc2Select,
    triggerDoc3Select,
    handleDoc1Upload,
    handleDoc2Upload,
    handleDoc3Upload,
    triggerDemoDocsAll,
    handleBack,
    handleRoleContinue,
    handleProfileSubmit,
    handleDocumentsSubmit,
    handleFinishSubmit,
    handleLoginSubmit,
    handleSendVerificationCode
  };
};
