import React, { useState } from 'react';
import { useEmployer } from '../../hooks/useEmployer';
import { EmployerDashboard } from './EmployerDashboard';
import { EmployerJobs } from './EmployerJobs';
import { EmployerApplicants } from './EmployerApplicants';
import { EmployerChats } from './EmployerChats';
import { EmployerProfile } from './EmployerProfile';
import { JobPostForm } from './JobPostForm';
import { EmployerAnalytics } from './EmployerAnalytics';
import { Briefcase, FileText, MessageCircle, LayoutDashboard, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { MandatoryReviewModal } from './components/MandatoryReviewModal';
import { Sidebar } from '../../components/Sidebar';
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";
import { isProfileComplete } from '../../utils/profileCompleteness';
import { showToast } from '../../utils/toast';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export const EmployerPanel: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
    const employerSelectedChatId = useUIStore(s => s.employerSelectedChatId);
  const { applications, reviewJob } = useEmployer();
  const [targetCandidate, setTargetCandidate] = useState<string | null>(null);

  const pendingReviewApp = applications.find(
    (app) => app.status === 'completed' && (!app.review || app.review.trim().length === 0)
  );

  const handleApplicantsChat = (candidateName: string) => {
    setTargetCandidate(candidateName);
    setCurrentScreen('employer-chats');
  };

  const handleClearTarget = () => {
    setTargetCandidate(null);
  };

  const userProfile = useAuthStore(s => s.userProfile);

  const handlePostJobClick = () => {
    if (!isProfileComplete(userProfile)) {
      showToast(language === 'uz' ? "Iltimos, e'lon berishdan oldin profilingizni to'liq to'ldiring (kompaniya nomi, telefon, manzil, email, haqida)." : language === 'ru' ? "Пожалуйста, полностью заполните профиль перед публикацией (название компании, телефон, адрес, email, о компании)." : "Please complete your profile before posting a job (company name, phone, address, email, about).");
      setCurrentScreen('employer-profile');
      return;
    }
    setCurrentScreen('employer-post');
  };

  const renderContent = () => {
    switch (currentScreen) {
      case 'employer-post':
        if (!isProfileComplete(userProfile)) {
          return <EmployerProfile />;
        }
        return (
          <JobPostForm 
            onBack={() => setCurrentScreen('employer-jobs')} 
            onSubmitSuccess={() => setCurrentScreen('employer-jobs')} 
          />
        );
      case 'employer-applicants':
        return (
          <EmployerApplicants 
            onChatClick={handleApplicantsChat} 
          />
        );
      case 'employer-chats':
        return (
          <EmployerChats 
            initialTargetCandidate={targetCandidate} 
            onClearTargetCandidate={handleClearTarget} 
          />
        );
      case 'employer-profile':
        return <EmployerProfile />;
      case 'employer-analytics':
        return <EmployerAnalytics />;
      case 'employer-jobs':
        return (
          <EmployerJobs 
             onPostJobClick={handlePostJobClick}
          />
        );
      case 'employer-dashboard':
      default:
        return (
          <EmployerDashboard 
            onPostJobClick={handlePostJobClick}
            onViewApplicantsClick={() => setCurrentScreen('employer-applicants')}
            onViewChatsClick={() => setCurrentScreen('employer-chats')}
            onViewAllJobsClick={() => setCurrentScreen('employer-jobs')}
            onViewAnalyticsClick={() => setCurrentScreen('employer-analytics')}
          />
        );
    }
  };

  // Bottom navigation specifically for Employer Mode
  const isFormScreen = currentScreen === 'employer-post';
  if (isFormScreen) {
    return (
      <div className="w-full min-h-screen bg-slate-50 overflow-y-auto">
        <ErrorBoundary key={currentScreen}>
          {renderContent()}
        </ErrorBoundary>
        <MandatoryReviewModal
          isOpen={!!pendingReviewApp}
          application={pendingReviewApp || null}
          onConfirm={async (data) => {
            if (pendingReviewApp) {
              await reviewJob(pendingReviewApp.jobId, { ...data, applicationId: pendingReviewApp.id });
            }
          }}
          language={language}
        />
      </div>
    );
  }

  const navItems = [
    { id: 'employer-dashboard', label: language === 'uz' ? "Asosiy" : language === 'ru' ? "Главная" : "Dashboard", icon: LayoutDashboard },
    { id: 'employer-jobs', label: language === 'uz' ? "E'lonlar" : language === 'ru' ? "Объявления" : "Jobs", icon: Briefcase },
    { id: 'employer-applicants', label: language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants", icon: FileText },
    { id: 'employer-chats', label: language === 'uz' ? "Xabarlar" : language === 'ru' ? "Сообщения" : "Messages", icon: MessageCircle },
    { id: 'employer-profile', label: language === 'uz' ? "Profil" : language === 'ru' ? "Профиль" : "Profile", icon: User },
  ];

  const isChatScreen = currentScreen === 'employer-chats';
  const isChatOpenOnMobile = isChatScreen && employerSelectedChatId;

  return (
    <div className="flex h-screen overflow-hidden w-full bg-brand-background">
      {/* ===== DESKTOP SIDEBAR (md: 768px+) ===== */}
      {/* The shared Sidebar, not a second one built here. It already
          switches to the employer menu on its own (it reads the role from
          AppContext), so the panel was maintaining a narrower copy that had
          drifted: no language selector, no Menyu / Hisob & Sozlamalar
          headings, and missing E'lon joylash, Sozlamalar and Yordam.

          It renders `hidden md:flex`, so the mobile bottom nav below is
          untouched - this replaces the desktop rail only. onOpenModal is not
          passed because the only thing Sidebar uses it for is the logged-out
          'auth' prompt, which an employer never reaches. */}
      <Sidebar />

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className={`flex-1 ${isChatScreen ? 'h-full overflow-hidden' : 'overflow-y-auto'} ${isChatOpenOnMobile ? 'pb-0' : 'pb-24 md:pb-0'}`}>
        <ErrorBoundary key={currentScreen}>
          {renderContent()}
        </ErrorBoundary>
      </div>

      {/* ===== MOBILE BOTTOM NAV (< md) ===== */}
      {!isChatOpenOnMobile && (
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white/95 backdrop-blur-md pb-safe h-16 md:hidden border-t border-slate-100/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center w-full max-w-sm mx-auto px-4 h-full relative">
            {navItems.map((item) => {
              const active = currentScreen === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id as any)}
                  className="flex flex-col items-center justify-center flex-1 h-full relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 select-none active:scale-95 transition-transform"
                >
                  <motion.div
                    animate={{ y: active ? 3 : 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                    className="relative w-9 h-9 flex items-center justify-center mb-1 rounded-full"
                  >
                    {active && (
                      <motion.div
                        layoutId="activeEmployerTab"
                        className="absolute inset-0 bg-brand-primary rounded-full shadow-[0_3px_10px_rgba(0,6,102,0.12)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center">
                      <Icon 
                        size={19} 
                        className={`transition-colors duration-200 ${
                          active ? 'text-white stroke-[2.3]' : 'text-brand-text-variant/70 stroke-[1.8]'
                        }`} 
                      />
                    </span>
                  </motion.div>
                  <span className={`text-[10px] tracking-wide transition-all duration-200 z-10 ${
                    active ? 'font-bold text-brand-primary' : 'font-medium text-brand-text-variant/70'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mandatory Review Modal that blocks employer until review is submitted */}
      <MandatoryReviewModal
        isOpen={!!pendingReviewApp}
        application={pendingReviewApp || null}
        onConfirm={async (data) => {
          if (pendingReviewApp) {
            await reviewJob(pendingReviewApp.jobId, { ...data, applicationId: pendingReviewApp.id });
          }
        }}
        language={language}
      />
    </div>
  );
};
