import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LOCAL_TEXTS } from '../components/login/LoginPromptScreen.utils';

export interface UseLoginPromptProps {
  isModal: boolean;
  onClose?: () => void;
}

export const useLoginPrompt = ({ isModal, onClose }: UseLoginPromptProps) => {
  const { language, setIsLoggedIn, setToastMessage, currentScreen, setCurrentScreen, setUserProfile, executePendingRedirect } = useApp();
  const t = LOCAL_TEXTS[language as 'uz' | 'ru' | 'en'] || LOCAL_TEXTS.uz;

  // Navigation mode: 'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login'
  const [mode, setModeState] = useState<'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login'>(() => {
    if (currentScreen === 'register') return 'role-selection';
    if (currentScreen === 'login') return 'login';
    try {
      const savedRole = localStorage.getItem('baito_preselected_role');
      if (savedRole === 'worker' || savedRole === 'employer') {
        return 'role-selection';
      }
    } catch (e) {}
    return 'login';
  });

  const setMode = (newMode: 'role-selection' | 'profile-info' | 'documents' | 'finish' | 'login') => {
    setModeState(newMode);
    if (newMode === 'login') {
      if (currentScreen !== 'login') {
        setCurrentScreen('login');
      }
    } else {
      if (currentScreen !== 'register') {
        setCurrentScreen('register');
      }
    }
  };

  useEffect(() => {
    if (currentScreen === 'register' && mode === 'login') {
      setModeState('role-selection');
    } else if (currentScreen === 'login' && mode !== 'login') {
      setModeState('login');
    }
  }, [currentScreen]);

  // Registration states
  const [selectedRole, setSelectedRole] = useState<'worker' | 'employer' | null>(() => {
    try {
      const savedRole = localStorage.getItem('baito_preselected_role');
      if (savedRole === 'worker' || savedRole === 'employer') {
        return savedRole;
      }
    } catch (e) {}
    return null;
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [email, setEmail] = useState('');

  // Documents states
  const [docFileName1, setDocFileName1] = useState('');
  const [docFileName2, setDocFileName2] = useState('');
  const [docFileName3, setDocFileName3] = useState('');
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [isDragging3, setIsDragging3] = useState(false);

  // Custom High-Fidelity Step 2 inputs
  const [passportSeries, setPassportSeries] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [jshshir, setJshshir] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stir, setStir] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [employeesCount, setEmployeesCount] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [website, setWebsite] = useState('');
  const [companyBio, setCompanyBio] = useState('');

  // Finish states
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Login states
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const doc1InputRef = useRef<HTMLInputElement>(null);
  const doc2InputRef = useRef<HTMLInputElement>(null);
  const doc3InputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const outerScreenRef = useRef<HTMLDivElement>(null);

  // Hidden form submit refs to make form triggering robust in any container/iframe
  const profileSubmitRef = useRef<HTMLButtonElement>(null);
  const documentsSubmitRef = useRef<HTMLButtonElement>(null);
  const finishSubmitRef = useRef<HTMLButtonElement>(null);
  const loginSubmitRef = useRef<HTMLButtonElement>(null);

  // Scroll to top when mode changes
  useEffect(() => {
    const resetScrolls = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainContainerRef.current) {
        mainContainerRef.current.scrollTop = 0;
      }
      if (outerScreenRef.current) {
        outerScreenRef.current.scrollTop = 0;
      }
    };

    resetScrolls();
    const rafId = requestAnimationFrame(resetScrolls);
    const timeoutId = setTimeout(resetScrolls, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [mode]);

  // File picker handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerDoc1Select = () => {
    doc1InputRef.current?.click();
  };

  const triggerDoc2Select = () => {
    doc2InputRef.current?.click();
  };

  const triggerDoc3Select = () => {
    doc3InputRef.current?.click();
  };

  const handleDoc1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName1(file.name);
    }
  };

  const handleDoc2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName2(file.name);
    }
  };

  const handleDoc3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName3(file.name);
    }
  };

  // Demo autofill for documents step
  const triggerDemoDocsAll = () => {
    if (selectedRole === 'worker') {
      setPassportSeries('AB');
      setPassportNumber('1234567');
      setJshshir('12345678901234');
      setDocFileName1('passport_front_scan.png');
      setDocFileName2('passport_back_scan.png');
      setDocFileName3('selfie_with_passport.jpg');
    } else {
      setCompanyName('Perfect Jobs MCHJ');
      setStir('123456789');
      setDocFileName1('company_registration_license.pdf');
      setDocFileName2('brand_identity_logo.png');
    }
  };

  // Flow handlers
  const handleBack = () => {
    if (mode === 'role-selection') {
      if (isModal && onClose) {
        onClose();
      } else {
        const hasPreselectedRole = localStorage.getItem('baito_preselected_role');
        setCurrentScreen(hasPreselectedRole ? 'landing' : 'xarita');
      }
    } else if (mode === 'profile-info') {
      setMode('role-selection');
    } else if (mode === 'documents') {
      setMode('profile-info');
    } else if (mode === 'finish') {
      setMode('documents');
    } else if (mode === 'login') {
      if (isModal && onClose) {
        onClose();
      } else {
        const hasPreselectedRole = localStorage.getItem('baito_preselected_role');
        setCurrentScreen(hasPreselectedRole ? 'landing' : 'xarita');
      }
    }
  };

  const handleRoleContinue = () => {
    if (selectedRole) {
      setMode('profile-info');
    }
  };

  const handleProfileSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedRole === 'worker') {
      if (!firstName || !lastName || !birthDay || !birthMonth || !birthYear || !gender) {
        setToastMessage(t.errorRequired);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    } else {
      if (!companyName || !industry || !location) {
        setToastMessage(t.errorRequired);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    }
    setMode('documents');
  };

  const handleDocumentsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedRole === 'worker') {
      if (!passportSeries || !passportNumber || !jshshir || !docFileName1 || !docFileName2 || !docFileName3) {
        setToastMessage(t.errorRequired);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      if (jshshir.trim().length !== 14 || isNaN(Number(jshshir.trim()))) {
        const msg = language === 'uz' ? "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak!" : language === 'ru' ? "ПИНФЛ должен состоять из 14 цифр!" : "JSHSHIR must be exactly 14 digits!";
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    } else {
      if (!companyName || !stir || !docFileName1) {
        setToastMessage(t.errorRequired);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      if (stir.trim().length !== 9 || isNaN(Number(stir.trim()))) {
        const msg = language === 'uz' ? "STIR (INN) 9 ta raqamdan iborat bo'lishi kerak!" : language === 'ru' ? "ИНН должен состоять из 9 цифр!" : "STIR (INN) must be exactly 9 digits!";
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    }
    setMode('finish');
  };

  const handleFinishSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regPhone || !regPassword || !regConfirmPassword) {
      setToastMessage(t.errorRequired);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setToastMessage(t.errorPasswordMatch);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (!agreeTerms) {
      setToastMessage(t.errorTerms);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newProfile = {
      firstName: selectedRole === 'worker' ? (firstName || 'Ozodbek') : (companyName || 'Korzinka.uz'),
      lastName: selectedRole === 'worker' ? (lastName || 'Salimov') : '',
      selectedRole: selectedRole || 'worker',
      birthDate: birthDay && birthMonth && birthYear ? `${birthDay}.${birthMonth}.${birthYear}` : '19.01.1996',
      phone: regPhone || '+998 (90) 123-45-67',
      docFileName1: docFileName1 || 'passport_front_scan.png',
      profileImage: profileImage || null,
    };
    setUserProfile(newProfile);
    setIsLoggedIn(true);
    const successMsg = t.finishSuccess;
    setToastMessage(successMsg);
    setTimeout(() => setToastMessage(null), 3000);
    
    if (isModal && onClose) {
      onClose();
    } else {
      const redirected = executePendingRedirect();
      if (!redirected) {
        setCurrentScreen('yakunlash');
      }
    }
  };

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginPhone || !loginPassword) {
      setToastMessage(t.errorRequired);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const demoProfile = {
      firstName: 'Ozodbek',
      lastName: 'Salimov',
      selectedRole: (selectedRole || 'worker') as 'worker' | 'employer',
      birthDate: '19.1.1996',
      phone: loginPhone || '+998 (90) 123-45-67',
      docFileName1: 'passport_front_scan.png',
      profileImage: null,
    };
    setUserProfile(demoProfile);
    setIsLoggedIn(true);
    const successMsg = language === 'uz' ? "Tizimga muvaffaqiyatli kirdingiz!" : language === 'ru' ? "Вы успешно вошли в систему!" : "Successfully logged in!";
    setToastMessage(successMsg);
    setTimeout(() => setToastMessage(null), 3000);
    
    if (isModal && onClose) {
      onClose();
    } else {
      const redirected = executePendingRedirect();
      if (!redirected) {
        if (demoProfile.selectedRole === 'employer') {
          setCurrentScreen('employer-dashboard');
        } else {
          setCurrentScreen('xarita');
        }
      }
    }
  };

  return {
    language,
    t,
    mode,
    setMode,
    selectedRole,
    setSelectedRole,
    profileImage,
    setProfileImage,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    birthDay,
    setBirthDay,
    birthMonth,
    setBirthMonth,
    birthYear,
    setBirthYear,
    gender,
    setGender,
    email,
    setEmail,
    docFileName1,
    setDocFileName1,
    docFileName2,
    setDocFileName2,
    docFileName3,
    setDocFileName3,
    isDragging1,
    setIsDragging1,
    isDragging2,
    setIsDragging2,
    isDragging3,
    setIsDragging3,
    passportSeries,
    setPassportSeries,
    passportNumber,
    setPassportNumber,
    jshshir,
    setJshshir,
    companyName,
    setCompanyName,
    industry,
    setIndustry,
    location,
    setLocation,
    employeesCount,
    setEmployeesCount,
    foundedYear,
    setFoundedYear,
    website,
    setWebsite,
    companyBio,
    setCompanyBio,
    stir,
    setStir,
    regPhone,
    setRegPhone,
    regPassword,
    setRegPassword,
    regConfirmPassword,
    setRegConfirmPassword,
    regShowPassword,
    setRegShowPassword,
    agreeTerms,
    setAgreeTerms,
    loginPhone,
    setLoginPhone,
    loginPassword,
    setLoginPassword,
    showPassword,
    setShowPassword,
    fileInputRef,
    doc1InputRef,
    doc2InputRef,
    doc3InputRef,
    mainContainerRef,
    outerScreenRef,
    profileSubmitRef,
    documentsSubmitRef,
    finishSubmitRef,
    loginSubmitRef,
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
    handleLoginSubmit
  };
};
