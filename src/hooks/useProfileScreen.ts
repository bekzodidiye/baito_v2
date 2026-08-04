import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useJobsData } from "../context/useJobsData";
import { getProfileTranslations } from '../features/worker/profile/ProfileScreen.utils';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { requestWithdrawalApi } from '../api/queries';

export const useProfileScreen = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { userProfile, setUserProfile, logout, language, setLanguage } = useApp();
  const { jobs } = useJobsData();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    import('../api/client').then(({ apiClient }) => {
      apiClient('/users/me')
        .then(data => {
          if (data && userProfile) {
            setUserProfile({
              ...userProfile,
              firstName: data.name || userProfile.firstName,
              phone: data.phone || userProfile.phone,
              selectedRole: (data.role as 'worker' | 'employer') || userProfile.selectedRole,
            });
          }
        })
        .catch(console.error);
    });
  }, []);

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
    setLanguage(langs[(idx + 1) % langs.length]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && userProfile) {
          setUserProfile({ ...userProfile, profileImage: event.target.result as string });
          showToast(language === 'uz' ? "Rasm yangilandi!" : "Photo updated!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    if (!editedFirstName.trim() || !editedLastName.trim()) {
      showToast(t.requiredFields);
      return;
    }
    const updated = {
      id: userProfile?.id || 'unknown',
      firstName: editedFirstName,
      lastName: editedLastName,
      selectedRole: userProfile?.selectedRole || 'worker',
      birthDate: userProfile?.birthDate || '19.1.1996',
      phone: editedPhone,
      docFileName1: userProfile?.docFileName1 || 'passport_front_scan.png',
      profileImage: userProfile?.profileImage || null
    };
    try {
      const { apiClient } = await import('../api/client');
      await apiClient('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name: `${editedFirstName} ${editedLastName}`, phone: editedPhone, role: userProfile?.selectedRole || 'worker' })
      });
      setUserProfile(updated);
      setActiveDialog('none');
      showToast(t.savedSuccess);
    } catch (err) {
      console.error(err);
      showToast(language === 'uz' ? "Xatolik yuz berdi" : "Error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  const handleShare = () => {
    const shareText = `Baito platformasidagi profilim: ${profileName} (${profileRole})`;
    if (navigator.share) {
      navigator.share({ title: 'Baito Profil', text: shareText, url: window.location.href }).catch(console.log);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.copied);
    }
  };

  const handleLogout = () => {
    logout();
    showToast(t.logoutSuccess);
  };

  const toggleRole = () => {
    if (!userProfile) return;
    const nextRole = userProfile.selectedRole === 'employer' ? 'worker' : 'employer';
    setUserProfile({ ...userProfile, selectedRole: nextRole });
    showToast(language === 'uz' ? `Tizimga ${nextRole === 'employer' ? "Ish beruvchi" : "Xodim"} sifatida kirdingiz` : `Switched to ${nextRole}`);
    setCurrentScreen(nextRole === 'employer' ? 'employer-dashboard' : 'jobs');
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      showToast(language === 'uz' ? "To'g'ri miqdor kiriting!" : "Enter a valid amount!");
      return;
    }
    
    try {
      await requestWithdrawalApi(Number(withdrawAmount));
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setActiveDialog('none');
        setWithdrawAmount('');
        showToast(t.withdrawSuccessMsg);
      }, 2500);
    } catch (err) {
      console.error(err);
      showToast(language === 'uz' ? "Xatolik yuz berdi" : "Error occurred");
    }
  };

  return {
    language,
    isEditing, userProfile, setCurrentScreen, setIsEditing,
    editedFirstName, setEditedFirstName, editedLastName, setEditedLastName, editedPhone, setEditedPhone,
    fileInputRef, expandedSection, setExpandedSection, activeDialog, setActiveDialog,
    withdrawAmount, setWithdrawAmount, withdrawSuccess, t, appliedJobsCount, showVerified,
    profileName, profileRole, profileImage, balance, toggleLanguage, handlePhotoUpload,
    handleSaveProfileSubmit, handleShare, handleLogout, handleWithdrawSubmit, toggleRole
  };
};

