import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useEmployer } from '../../hooks/useEmployer';
import { EmployerDashboard } from './EmployerDashboard';
import { EmployerJobs } from './EmployerJobs';
import { EmployerApplicants } from './EmployerApplicants';
import { EmployerChats } from './EmployerChats';
import { EmployerProfile } from './EmployerProfile';
import { JobPostForm } from './JobPostForm';
import { EmployerAnalytics } from './EmployerAnalytics';
import { Briefcase, FileText, MessageSquare, PlusCircle, LayoutDashboard, User, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const EmployerPanel: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language, employerSelectedChatId } = useApp();
  const [targetCandidate, setTargetCandidate] = useState<string | null>(null);

  const handleApplicantsChat = (candidateName: string) => {
    setTargetCandidate(candidateName);
    setCurrentScreen('employer-chats');
  };

  const handleClearTarget = () => {
    setTargetCandidate(null);
  };

  const renderContent = () => {
    switch (currentScreen) {
      case 'employer-post':
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
             onPostJobClick={() => setCurrentScreen('employer-post')}
          />
        );
      case 'employer-dashboard':
      default:
        return (
          <EmployerDashboard 
            onPostJobClick={() => setCurrentScreen('employer-post')}
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
        {renderContent()}
      </div>
    );
  }

  const navItems = [
    { id: 'employer-dashboard', label: language === 'uz' ? "Asosiy" : language === 'ru' ? "Главная" : "Dashboard", icon: LayoutDashboard },
    { id: 'employer-jobs', label: language === 'uz' ? "E'lonlar" : language === 'ru' ? "Объявления" : "Jobs", icon: Briefcase },
    { id: 'employer-applicants', label: language === 'uz' ? "Arizalar" : language === 'ru' ? "Заявки" : "Applicants", icon: FileText },
    { id: 'employer-chats', label: language === 'uz' ? "Suhbatlar" : language === 'ru' ? "Чаты" : "Chats", icon: MessageSquare },
    { id: 'employer-profile', label: language === 'uz' ? "Profil" : language === 'ru' ? "Профиль" : "Profile", icon: User },
  ];

  const isChatScreen = currentScreen === 'employer-chats';
  const isChatOpenOnMobile = isChatScreen && employerSelectedChatId;

  return (
    <div className="flex h-screen overflow-hidden w-full bg-brand-background">
      {/* ===== DESKTOP SIDEBAR (md: 768px+) ===== */}
      <aside className="hidden md:flex md:flex-col w-56 shrink-0 bg-white border-r border-slate-100 h-screen sticky top-0 shadow-xs">
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center text-white font-black text-sm shrink-0">B</div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">Baito</p>
            <p className="text-[10px] font-bold text-brand-primary">
              {language === 'uz' ? 'Ish beruvchi' : language === 'ru' ? 'Работодатель' : 'Employer'}
            </p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = currentScreen === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Post Job Button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setCurrentScreen('employer-post')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <PlusCircle size={14} />
            <span>{language === 'uz' ? "E'lon qo'shish" : language === 'ru' ? 'Добавить' : 'Post job'}</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className={`flex-1 overflow-y-auto ${isChatOpenOnMobile ? 'pb-0' : 'pb-24 md:pb-0'}`}>
        {renderContent()}
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
    </div>
  );
};
