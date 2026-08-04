import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useProfileScreen } from '../../hooks/useProfileScreen';
import { ProfileAccordion } from './ProfileAccordion';
import { ProfileDialogs } from './ProfileDialogs';
import { ProfileHero } from './ProfileHero';
import { ProfileWidgets } from './ProfileWidgets';
import { ProfileCompletionWidget } from './ProfileCompletionWidget';

export const ProfileScreen: React.FC = () => {
  const {
    language,
    userProfile,
    setCurrentScreen,
    setToastMessage,
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
    handleLogout,
    handleWithdrawSubmit,
    editedFirstName,
    setEditedFirstName,
    editedLastName,
    setEditedLastName,
    editedPhone,
    setEditedPhone,
    toggleRole
  } = useProfileScreen();

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-6 pb-20 md:pb-6 flex flex-col relative">
      {/* TopAppBar Custom for screen integration consistency */}
      <header className="w-full flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentScreen('xarita')}
            className="p-2 hover:bg-slate-50 transition-colors rounded-full text-slate-700 cursor-pointer outline-none"
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
            appliedJobsCount={appliedJobsCount}
            t={t}
            onEditClick={() => setActiveDialog('edit')}
          />

          {/* Profile Completion Widget */}
          <ProfileCompletionWidget language={language} />

          {/* Toggle Role Widget */}
          <section className="bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 shadow-sm flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-brand-primary tracking-widest">
                  {language === 'uz' ? "FAOLIYAT TURI" : language === 'ru' ? "РЕЖИМ АККАУНТА" : "ACCOUNT MODE"}
                </p>
                <h3 className="font-display font-extrabold text-[11px] mt-0.5 text-slate-200 leading-snug">
                  {userProfile?.selectedRole === 'employer' 
                    ? (language === 'uz' ? "Ish beruvchi rejimi faol. Xodim rejimiga o'tish:" : language === 'ru' ? "Режим работодателя активен. Перейти в режим работника:" : "Employer mode is active. Switch to worker mode:")
                    : (language === 'uz' ? "Xodim rejimi faol. Ish beruvchi rejimiga o'tish:" : language === 'ru' ? "Режим работника активен. Перейти в режим работодателя:" : "Worker mode is active. Switch to employer mode:")
                  }
                </h3>
              </div>
            </div>
            <button
              onClick={toggleRole}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-display font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer outline-none shadow-sm"
            >
              {userProfile?.selectedRole === 'employer'
                ? (language === 'uz' ? "Xodim rejimiga o'tish" : language === 'ru' ? "Режим работника" : "Worker Mode")
                : (language === 'uz' ? "Ish beruvchi rejimiga o'tish" : language === 'ru' ? "Режим работодателя" : "Employer Mode")
              }
            </button>
          </section>
        </div>

        {/* Right Column: Widgets, Accordion & Logout */}
        <div className="lg:col-span-7 flex flex-col gap-5 w-full">
          {/* Action Widgets: Wallet Balance & Verification */}
          <ProfileWidgets 
            t={t}
            language={language}
            showVerified={showVerified}
            setToastMessage={setToastMessage}
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
            setToastMessage={setToastMessage}
            setActiveDialog={setActiveDialog}
            toggleLanguage={toggleLanguage}
          />

          {/* Footer Logout Action */}
          <div className="w-full pt-1">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-rose-600 hover:text-rose-700 font-display font-black text-xs bg-white hover:bg-rose-50/50 transition-all rounded-xl border border-rose-100 cursor-pointer outline-none active:scale-98 shadow-2xs"
            >
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
        editedFirstName={editedFirstName}
        setEditedFirstName={setEditedFirstName}
        editedLastName={editedLastName}
        setEditedLastName={setEditedLastName}
        editedPhone={editedPhone}
        setEditedPhone={setEditedPhone}
        handleSaveProfileSubmit={handleSaveProfileSubmit}
      />
    </div>
  );
};

