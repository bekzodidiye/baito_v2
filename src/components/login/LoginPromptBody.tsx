import React from 'react';
import { AnimatePresence } from 'motion/react';
import { RoleSelectionView } from './RoleSelectionView';
import { ProfileInfoView } from './ProfileInfoView';
import { EmployerProfileInfoView } from './EmployerProfileInfoView';
import { DocumentsView } from './DocumentsView';
import { FinishView } from './FinishView';
import { LoginView } from './LoginView';

interface LoginPromptBodyProps {
  p: any;
}

export const LoginPromptBody: React.FC<LoginPromptBodyProps> = ({ p }) => {
  const { mode, setMode, selectedRole, t, language, isModal } = p;

  return (
    <AnimatePresence mode="wait">
      {mode === 'role-selection' && (
        <RoleSelectionView
          selectedRole={selectedRole}
          setSelectedRole={p.setSelectedRole}
          handleRoleContinue={p.handleRoleContinue}
          setMode={setMode}
          t={t}
          isModal={isModal}
        />
      )}

      {mode === 'login' && (
        <LoginView
          loginPhone={p.loginPhone}
          setLoginPhone={p.setLoginPhone}
          loginPassword={p.loginPassword}
          setLoginPassword={p.setLoginPassword}
          showPassword={p.showPassword}
          setShowPassword={p.setShowPassword}
          loginSubmitRef={p.loginSubmitRef}
          handleLoginSubmit={p.handleLoginSubmit}
          setMode={setMode}
          t={t}
          language={language}
          isModal={isModal}
        />
      )}

      {mode === 'profile-info' && (
        selectedRole === 'worker' ? (
          <ProfileInfoView
            profileImage={p.profileImage}
            triggerFileSelect={p.triggerFileSelect}
            fileInputRef={p.fileInputRef}
            handlePhotoUpload={p.handlePhotoUpload}
            setProfileImage={p.setProfileImage}
            firstName={p.firstName}
            setFirstName={p.setFirstName}
            lastName={p.lastName}
            setLastName={p.setLastName}
            birthDay={p.birthDay}
            setBirthDay={p.setBirthDay}
            birthMonth={p.birthMonth}
            setBirthMonth={p.setBirthMonth}
            birthYear={p.birthYear}
            setBirthYear={p.setBirthYear}
            gender={p.gender}
            setGender={p.setGender}
            email={p.email}
            setEmail={p.setEmail}
            profileSubmitRef={p.profileSubmitRef}
            handleProfileSubmit={p.handleProfileSubmit}
            t={t}
            language={language}
            isModal={isModal}
          />
        ) : (
          <EmployerProfileInfoView
            profileImage={p.profileImage}
            triggerFileSelect={p.triggerFileSelect}
            fileInputRef={p.fileInputRef}
            handlePhotoUpload={p.handlePhotoUpload}
            setProfileImage={p.setProfileImage}
            companyName={p.companyName}
            setCompanyName={p.setCompanyName}
            industry={p.industry}
            setIndustry={p.setIndustry}
            location={p.location}
            setLocation={p.setLocation}
            employeesCount={p.employeesCount}
            setEmployeesCount={p.setEmployeesCount}
            foundedYear={p.foundedYear}
            setFoundedYear={p.setFoundedYear}
            website={p.website}
            setWebsite={p.setWebsite}
            companyBio={p.companyBio}
            setCompanyBio={p.setCompanyBio}
            profileSubmitRef={p.profileSubmitRef}
            handleProfileSubmit={p.handleProfileSubmit}
            t={t}
            language={language}
            isModal={isModal}
          />
        )
      )}

      {mode === 'documents' && (
        <DocumentsView
          selectedRole={selectedRole}
          doc1InputRef={p.doc1InputRef}
          doc2InputRef={p.doc2InputRef}
          doc3InputRef={p.doc3InputRef}
          triggerDoc1Select={p.triggerDoc1Select}
          triggerDoc2Select={p.triggerDoc2Select}
          triggerDoc3Select={p.triggerDoc3Select}
          handleDoc1Upload={p.handleDoc1Upload}
          handleDoc2Upload={p.handleDoc2Upload}
          handleDoc3Upload={p.handleDoc3Upload}
          docFileName1={p.docFileName1}
          docFileName2={p.docFileName2}
          docFileName3={p.docFileName3}
          setDocFileName1={p.setDocFileName1}
          setDocFileName2={p.setDocFileName2}
          setDocFileName3={p.setDocFileName3}
          isDragging1={p.isDragging1}
          setIsDragging1={p.setIsDragging1}
          isDragging2={p.isDragging2}
          setIsDragging2={p.setIsDragging2}
          isDragging3={p.isDragging3}
          setIsDragging3={p.setIsDragging3}
          triggerDemoDocsAll={p.triggerDemoDocsAll}
          passportSeries={p.passportSeries}
          setPassportSeries={p.setPassportSeries}
          passportNumber={p.passportNumber}
          setPassportNumber={p.setPassportNumber}
          jshshir={p.jshshir}
          setJshshir={p.setJshshir}
          companyName={p.companyName}
          setCompanyName={p.setCompanyName}
          stir={p.stir}
          setStir={p.setStir}
          documentsSubmitRef={p.documentsSubmitRef}
          handleDocumentsSubmit={p.handleDocumentsSubmit}
          t={t}
          language={language}
          isModal={isModal}
        />
      )}

      {mode === 'finish' && (
        <FinishView
          selectedRole={selectedRole}
          regPhone={p.regPhone}
          setRegPhone={p.setRegPhone}
          regPassword={p.regPassword}
          setRegPassword={p.setRegPassword}
          regConfirmPassword={p.regConfirmPassword}
          setRegConfirmPassword={p.setRegConfirmPassword}
          regShowPassword={p.regShowPassword}
          setRegShowPassword={p.setRegShowPassword}
          agreeTerms={p.agreeTerms}
          setAgreeTerms={p.setAgreeTerms}
          finishSubmitRef={p.finishSubmitRef}
          handleFinishSubmit={p.handleFinishSubmit}
          t={t}
          isModal={isModal}
        />
      )}
    </AnimatePresence>
  );
};
