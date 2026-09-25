import { translations } from '../../../translations';
import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useProfileScreen } from '../../../hooks/useProfileScreen';
import { ProfileAccordion } from './ProfileAccordion';
import { ProfileDialogs } from './ProfileDialogs';
import { ProfileHero } from './ProfileHero';
import { ProfileWidgets } from './ProfileWidgets';
import { ProfileAboutWidget } from './ProfileAboutWidget';
import { ProfileCompletionWidget } from './ProfileCompletionWidget';
import { ProfileReviewsWidget } from './ProfileReviewsWidget';
import { showToast } from '../../../utils/toast';
import { useCurrentScreen } from '../../../hooks/useCurrentScreen';

export const ProfileScreen: React.FC = () => {
  const {
    language,
    isEditing,
    userProfile,
    setCurrentScreen,
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
    isVerifiedUser,
    profileName,
    profileRole,
    profileImage,
    balance,
    toggleLanguage,
    handlePhotoUpload,
    handleSaveProfileSubmit,
    handleLogout,
    handleWithdrawSubmit,
    editForm,
    setEditForm
  } = useProfileScreen();
  const tGlobal = translations[language];

  React.useEffect(() => {
    const handleScrollEvent = (e: Event) => {
      setActiveDialog('edit');
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setTimeout(() => {
          const el = document.getElementById(`input-${detail}`);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400); // Wait for modal animation to complete
      }
    };
    window.addEventListener('scroll-to-profile-section', handleScrollEvent);
    return () => window.removeEventListener('scroll-to-profile-section', handleScrollEvent);
  }, [setActiveDialog]);

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 pb-28 md:pb-6 flex flex-col relative">
      {/* TopAppBar Custom for screen integration consistency */}
      <header className="w-full flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentScreen('jobs')}
            aria-label={tGlobal.goBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </button>
          <h1 className="font-display text-base font-black text-brand-primary">{t.profileTitle}</h1>
        </div>
      </header>

      {/* Main Container - Desktop Grid */}
      <div className="w-full flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero, Completion & Role */}
        <div className="lg:col-span-5 flex flex-col gap-5 w-full">
          {/* Profile Hero with Photo, Name & Edit Button */}
          <ProfileHero 
            profileName={profileName}
            profileRole={profileRole}
            profileImage={profileImage}
            fileInputRef={fileInputRef}
            handlePhotoUpload={handlePhotoUpload}
            rating={userProfile?.rating || 0}
            completedJobsCount={userProfile?.completedJobsCount || 0}
            region={userProfile?.region}
            t={t}
            onEditClick={() => setActiveDialog('edit')}
          />

          {/* Profile About Widget */}
          <ProfileAboutWidget language={language} />

          {/* Profile Completion Widget */}
          <ProfileCompletionWidget 
            language={language} 
            setActiveDialog={setActiveDialog}
          />

          {/* Profile Reviews Widget */}
          <ProfileReviewsWidget language={language} />

          {/* The account-mode switch used to sit here. One person is either
              hiring or looking for work in a given session, and the switch let
              a half-finished flow on one side be abandoned by a single tap
              into the other. Removed from both profiles; admins still switch
              panels from the admin sidebar, which is a different job. */}
        </div>

        {/* Right Column: Widgets, Accordion & Logout */}
        <div className="lg:col-span-7 flex flex-col gap-5 w-full">
          {/* Action Widgets: Wallet Balance & Verification */}
          <ProfileWidgets 
            t={t}
            language={language}
            showVerified={showVerified}
            isVerifiedUser={isVerifiedUser}
            setCurrentScreen={setCurrentScreen}
            setActiveDialog={setActiveDialog}
            balance={balance}
          />

          {/* Info Categories - Accordions List */}
          <ProfileAccordion 
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            t={t}
            language={language}
            setCurrentScreen={setCurrentScreen}
            setActiveDialog={setActiveDialog}
            toggleLanguage={toggleLanguage}
          />

          {/* Footer Logout Action */}
          <div className="w-full pt-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-rose-600 hover:text-rose-700 font-display font-black text-xs bg-white hover:bg-rose-50/50 transition-all rounded-xl border border-rose-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-98 shadow-2xs"
             aria-label={t.logout}>
<LogOut size={14} className="stroke-[2.5]" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DIALOGS AND MODALS */}
      <ProfileDialogs 
        activeDialog={activeDialog}
        setActiveDialog={setActiveDialog}
        t={t}
        language={language}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        withdrawSuccess={withdrawSuccess}
        handleWithdrawSubmit={handleWithdrawSubmit}
        editForm={editForm}
        setEditForm={setEditForm}
        handleSaveProfileSubmit={handleSaveProfileSubmit}
        isEditing={isEditing}
      />
    </div>
  );
};

