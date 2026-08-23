import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useJobsData } from "../context/useJobsData";
import { getProfileTranslations } from '../features/worker/profile/ProfileScreen.utils';
import { showToast } from '../utils/toast';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { requestWithdrawalApi, uploadFileApi } from '../api/queries';
import { apiClient } from '../api/client';
import { useQuery } from '@tanstack/react-query';

export const useProfileScreen = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { userProfile, setUserProfile, logout, language, setLanguage } = useApp();
  const { jobs } = useJobsData();
  const [balance, setBalance] = useState('0');

  useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const data = await apiClient('/users/me');
      if (data && userProfile) {
        let fName = userProfile.firstName;
        let lName = userProfile.lastName;
        if (data.name) {
          const [first, ...rest] = data.name.trim().split(/\s+/);
          fName = first || fName;
          lName = rest.join(' ') || lName;
        }
        setUserProfile({
          ...userProfile,
          firstName: fName,
          lastName: lName,
          phone: data.phone || userProfile.phone,
          selectedRole: (data.role as 'worker' | 'employer') || userProfile.selectedRole,
          profileImage: data.avatarUrl || userProfile.profileImage,
          email: data.email || userProfile.email,
          gender: data.gender || userProfile.gender,
          birthDate: data.birthDate || userProfile.birthDate,
          region: data.region || userProfile.region,
          profession: data.category || userProfile.profession,
          aboutMe: data.bio || userProfile.aboutMe,
          skills: Array.isArray(data.skills) ? data.skills : (data.skills ? [data.skills] : userProfile.skills),
          passportSeries: data.passportSeries || userProfile.passportSeries,
          pinfl: data.passportJshshir || userProfile.pinfl,
          docFileName1: data.passportDocFront || userProfile.docFileName1,
          docFileName2: data.passportDocBack || userProfile.docFileName2,
          docFileName3: data.selfieWithDoc || (userProfile as any).docFileName3,
          isVerified: data.isVerified ?? userProfile.isVerified,
          rating: data.rating ?? userProfile.rating,
          completedJobsCount: data.completedJobsCount ?? userProfile.completedJobsCount,
          notify_new_jobs: data.notify_new_jobs ?? userProfile.notify_new_jobs,
          notify_interviews: data.notify_interviews ?? userProfile.notify_interviews,
          notify_general: data.notify_general ?? userProfile.notify_general,
          two_factor_enabled: data.two_factor_enabled ?? userProfile.two_factor_enabled,
          biometrics_enabled: data.biometrics_enabled ?? userProfile.biometrics_enabled,
        });
      }
      return data;
    },
    enabled: !!userProfile
  });

  const [isEditing, setIsEditing] = useState(false);
  const [by, bm, bd] = (userProfile?.birthDate || '1996-01-19').split('-');

  const [editForm, setEditForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    birthDay: String(parseInt(bd || '19', 10)),
    birthMonth: String(parseInt(bm || '1', 10)),
    birthYear: by || '1996',
    gender: userProfile?.gender || 'male',
    region: userProfile?.region || '',
    profession: userProfile?.profession || '',
    aboutMe: userProfile?.aboutMe || '',
    skills: userProfile?.skills?.join(', ') || '',
    passportSeries: userProfile?.passportSeries?.replace(/[^A-Za-z]/g, '') || '',
    passportNumber: userProfile?.passportSeries?.replace(/[^0-9]/g, '') || '',
    pinfl: userProfile?.pinfl || '',
    docFileName1: userProfile?.docFileName1 || '',
    docFileName2: userProfile?.docFileName2 || '',
    profileImage: userProfile?.profileImage || null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile && !isEditing) {
      const [by, bm, bd] = (userProfile.birthDate || '1996-01-19').split('-');
      setEditForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        birthDay: String(parseInt(bd || '19', 10)),
        birthMonth: String(parseInt(bm || '1', 10)),
        birthYear: by || '1996',
        gender: userProfile.gender || 'male',
        region: userProfile.region || '',
        profession: userProfile.profession || '',
        aboutMe: userProfile.aboutMe || '',
        skills: userProfile.skills?.join(', ') || '',
        passportSeries: userProfile.passportSeries?.replace(/[^A-Za-z]/g, '') || '',
        passportNumber: userProfile.passportSeries?.replace(/[^0-9]/g, '') || '',
        pinfl: userProfile.pinfl || '',
        docFileName1: userProfile.docFileName1 || '',
        docFileName2: userProfile.docFileName2 || '',
        profileImage: userProfile.profileImage || null
      });
    }
  }, [userProfile]);

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
  const isVerifiedUser = !!userProfile?.isVerified;
  
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userProfile) {
      // 1. Instant local preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && userProfile) {
          setUserProfile({ ...userProfile, profileImage: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);

      // 2. Upload to MinIO S3 and save to user profile
      try {
        const uploadedUrl = await uploadFileApi(file);
        await apiClient('/users/me', {
          method: 'PUT',
          body: JSON.stringify({ avatarUrl: uploadedUrl })
        });
        setUserProfile({ ...userProfile, profileImage: uploadedUrl });
        showToast(language === 'uz' ? "Rasm muvaffaqiyatli saqlandi!" : "Photo saved successfully!");
      } catch (err) {
        console.error('Avatar upload failed:', err);
        showToast(language === 'uz' ? "Rasm yuklashda xatolik yuz berdi" : "Failed to upload photo");
      }
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      showToast(t.requiredFields);
      return;
    }
    const updated = {
      id: userProfile?.id || 'unknown',
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      selectedRole: userProfile?.selectedRole || 'worker',
      birthDate: `${editForm.birthYear}-${editForm.birthMonth.padStart(2, '0')}-${editForm.birthDay.padStart(2, '0')}`,
      phone: editForm.phone,
      docFileName1: editForm.docFileName1 || userProfile?.docFileName1 || 'passport_front_scan.png',
      docFileName2: editForm.docFileName2 || userProfile?.docFileName2,
      profileImage: editForm.profileImage || userProfile?.profileImage || null,
      email: editForm.email,
      gender: editForm.gender as 'male'|'female'|'',
      region: editForm.region,
      profession: editForm.profession,
      aboutMe: editForm.aboutMe,
      skills: editForm.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      passportSeries: `${editForm.passportSeries} ${editForm.passportNumber}`.trim(),
      pinfl: editForm.pinfl,
      isVerified: userProfile?.isVerified || false,
      rating: userProfile?.rating || 0,
      completedJobsCount: userProfile?.completedJobsCount || 0,
      docFileName3: userProfile?.docFileName3
    };
    try {
      const updatePayload = {
        name: `${editForm.firstName} ${editForm.lastName}`.trim(),
        phone: editForm.phone,
        email: editForm.email || undefined,
        gender: editForm.gender || undefined,
        birthDate: updated.birthDate || undefined,
        region: editForm.region || undefined,
        category: editForm.profession || undefined,
        bio: editForm.aboutMe || undefined,
        skills: updated.skills.length > 0 ? updated.skills : undefined,
        passportSeries: updated.passportSeries || undefined,
        passportJshshir: updated.pinfl || undefined,
        passportDocFront: editForm.docFileName1 || undefined,
        passportDocBack: editForm.docFileName2 || undefined,
        selfieWithDoc: (userProfile as any)?.docFileName3 || undefined,
        avatarUrl: editForm.profileImage || undefined,
      };

      const responseData = await apiClient('/users/me', {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });

      let fName = responseData?.name || updated.firstName;
      let lName = updated.lastName;
      if (responseData?.name && responseData.name.includes(' ')) {
        const parts = responseData.name.split(' ');
        fName = parts[0];
        lName = parts.slice(1).join(' ');
      } else if (responseData?.name) {
        fName = responseData.name;
        lName = '';
      }

      setUserProfile({
        ...updated,
        firstName: fName,
        lastName: lName,
        isVerified: responseData?.isVerified ?? updated.isVerified,
        rating: responseData?.rating ?? updated.rating,
        completedJobsCount: responseData?.completedJobsCount ?? updated.completedJobsCount
      });

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
    editForm, setEditForm,
    fileInputRef, expandedSection, setExpandedSection, activeDialog, setActiveDialog,
    withdrawAmount, setWithdrawAmount, withdrawSuccess, t, appliedJobsCount, showVerified, isVerifiedUser,
    profileName, profileRole, profileImage, balance, toggleLanguage, handlePhotoUpload,
    handleSaveProfileSubmit, handleShare, handleLogout, handleWithdrawSubmit, toggleRole
  };
};

