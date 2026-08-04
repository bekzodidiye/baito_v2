import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getProfileTranslations } from '../components/profile/ProfileScreen.utils';

export const useProfileScreen = () => {
  const { 
    userProfile, 
    setUserProfile, 
    setIsLoggedIn, 
    setCurrentScreen, 
    language, 
    setLanguage, 
    setToastMessage,
    jobs
  } = useApp();

  const [balance, setBalance] = useState('0');

  useEffect(() => {
    fetch('/api/me', { headers: { 'x-user-role': userProfile?.selectedRole || 'worker' } })
      .then(res => res.json())
      .then(data => {
        if (data && data.balance) {
          setBalance(data.balance);
        }
      })
      .catch(console.error);
  }, [userProfile?.selectedRole]);

  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState(userProfile?.firstName || 'Ozodbek');
  const [editedLastName, setEditedLastName] = useState(userProfile?.lastName || 'Salimov');
  const [editedPhone, setEditedPhone] = useState(userProfile?.phone || '+998 (90) 123-45-67');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion active sections
  const [expandedSection, setExpandedSection] = useState<'activity' | 'settings' | 'help' | null>('activity');
  
  // Dialogs
  const [activeDialog, setActiveDialog] = useState<'withdraw' | 'edit' | 'none'>('none');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const t = getProfileTranslations(language);

  // Dynamic values
  const appliedJobsCount = jobs.filter(j => j.applied || j.status === 'applied').length;
  const showVerified = !!userProfile?.docFileName1;
  
  const profileName = userProfile 
    ? `${userProfile.firstName} ${userProfile.lastName}` 
    : 'Demo User';
  const profileRole = userProfile?.selectedRole === 'employer' ? t.employerRole : t.workerRole;
  const profileImage = userProfile?.profileImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBV5vW9Q4kqcTjWFKoh-KR04d1qzMZPJ62TDzGP6_gX-nGUH6-3jlTsJQ90EfuIefQNJheUcY9CRWFNakg652EU2JbKupldyWYP-rpC64brXMbbrLUmwXosUlEpwaqzePB-co_wbYO2TugYmaW6th1vxxa6L1e0Zjc71aKsTVR0EPwJ7_6vnmpXqapqsQ-o6ntR3kaIJvHEXeFTLrpQ4oelMSTrKykETbGUF45T9L4Ayf-1EZX-E1p-';

  const toggleLanguage = () => {
    const langs: ('uz' | 'ru' | 'en')[] = ['uz', 'ru', 'en'];
    const idx = langs.indexOf(language);
    const nextLang = langs[(idx + 1) % langs.length];
    setLanguage(nextLang);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && userProfile) {
          setUserProfile({
            ...userProfile,
            profileImage: event.target.result as string
          });
          setToastMessage(language === 'uz' ? "Rasm yangilandi!" : language === 'ru' ? "Фото обновлено!" : "Photo updated!");
          setTimeout(() => setToastMessage(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedFirstName.trim() || !editedLastName.trim()) {
      setToastMessage(t.requiredFields);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const updated = {
      firstName: editedFirstName,
      lastName: editedLastName,
      selectedRole: userProfile?.selectedRole || 'worker',
      birthDate: userProfile?.birthDate || '19.1.1996',
      phone: editedPhone,
      docFileName1: userProfile?.docFileName1 || 'passport_front_scan.png',
      profileImage: userProfile?.profileImage || null
    };

    setUserProfile(updated);
    setIsEditing(false);
    setActiveDialog('none');
    setToastMessage(t.savedSuccess);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = () => {
    const shareText = `Baito platformasidagi profilim: ${profileName} (${profileRole})`;
    if (navigator.share) {
      navigator.share({
        title: 'Baito Profil',
        text: shareText,
        url: window.location.href,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage(t.copied);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserProfile(null);
    setToastMessage(t.logoutSuccess);
    setTimeout(() => setToastMessage(null), 3000);
    setCurrentScreen('xarita');
  };

  const toggleRole = () => {
    if (!userProfile) return;
    const nextRole = userProfile.selectedRole === 'employer' ? 'worker' : 'employer';
    setUserProfile({
      ...userProfile,
      selectedRole: nextRole
    });
    setToastMessage(
      language === 'uz' ? `Tizimga ${nextRole === 'employer' ? "Ish beruvchi" : "Xodim"} sifatida kirdingiz` : language === 'ru' ? `You logged in as ${nextRole === 'employer' ? "Employer" : "Worker"}` : `You logged in as ${nextRole === 'employer' ? "Employer" : "Worker"}`
    );
    setTimeout(() => setToastMessage(null), 3500);
    setCurrentScreen(nextRole === 'employer' ? 'employer-dashboard' : 'xarita');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      setToastMessage(language === 'uz' ? "To'g'ri miqdor kiriting!" : language === 'ru' ? "Введите корректную сумму!" : "Enter a valid amount!");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setWithdrawSuccess(true);
    setTimeout(() => {
      setActiveDialog('none');
      setWithdrawSuccess(false);
      setWithdrawAmount('');
      setToastMessage(t.withdrawSuccessMsg);
      setTimeout(() => setToastMessage(null), 4000);
    }, 1500);
  };

  return {
    language,
    userProfile,
    setCurrentScreen,
    setToastMessage,
    isEditing,
    setIsEditing,
    editedFirstName,
    setEditedFirstName,
    editedLastName,
    setEditedLastName,
    editedPhone,
    setEditedPhone,
    fileInputRef,
    expandedSection,
    setExpandedSection,
    activeDialog,
    setActiveDialog,
    withdrawAmount,
    setWithdrawAmount,
    withdrawSuccess,
    t,
    appliedJobsCount,
    showVerified,
    profileName,
    profileRole,
    profileImage,
    balance,
    toggleLanguage,
    handlePhotoUpload,
    handleSaveProfileSubmit,
    handleShare,
    handleLogout,
    handleWithdrawSubmit,
    toggleRole
  };
};
