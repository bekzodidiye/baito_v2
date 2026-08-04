import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const useLoginState = (isModal: boolean) => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  

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
        return savedRole as 'worker' | 'employer';
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

  return {
    mode, setMode,
    selectedRole, setSelectedRole,
    profileImage, setProfileImage,
    firstName, setFirstName,
    lastName, setLastName,
    birthDay, setBirthDay,
    birthMonth, setBirthMonth,
    birthYear, setBirthYear,
    gender, setGender,
    email, setEmail,
    docFileName1, setDocFileName1,
    docFileName2, setDocFileName2,
    docFileName3, setDocFileName3,
    isDragging1, setIsDragging1,
    isDragging2, setIsDragging2,
    isDragging3, setIsDragging3,
    passportSeries, setPassportSeries,
    passportNumber, setPassportNumber,
    jshshir, setJshshir,
    companyName, setCompanyName,
    stir, setStir,
    industry, setIndustry,
    location, setLocation,
    employeesCount, setEmployeesCount,
    foundedYear, setFoundedYear,
    website, setWebsite,
    companyBio, setCompanyBio,
    regPhone, setRegPhone,
    regPassword, setRegPassword,
    regConfirmPassword, setRegConfirmPassword,
    regShowPassword, setRegShowPassword,
    agreeTerms, setAgreeTerms,
    loginPhone, setLoginPhone,
    loginPassword, setLoginPassword,
    showPassword, setShowPassword,
    fileInputRef, doc1InputRef, doc2InputRef, doc3InputRef,
    mainContainerRef, outerScreenRef,
    profileSubmitRef, documentsSubmitRef, finishSubmitRef, loginSubmitRef
  };
};
