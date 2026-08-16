import { ToastContainer } from './components/ToastContainer';
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MapViewScreen } from './components/map/MapViewScreen';
import { RegionSelector } from './components/RegionSelector';
import { MenuModals } from './components/MenuModals';
import { OnboardingTour } from './components/OnboardingTour';
import { GatedLockScreen } from './components/GatedLockScreen';
import { SettingsLayout } from './components/settings/SettingsLayout';
import { MotionConfig } from 'motion/react';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { AppRoutes } from './components/AppRoutes';
import { useCurrentScreen } from './hooks/useCurrentScreen';

function AppContent() {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { isLoggedIn, userProfile, requireAuth } = useApp();
  const [hasOpenedMap, setHasOpenedMap] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'help' | 'auth' | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  useEffect(() => {
    if (currentScreen === 'jobs') {
      setHasOpenedMap(true);
    }

    // Scroll window to top when navigating
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also scroll the main container if it has independent scrolling
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [currentScreen]);


  
  const handleOpenModal = (type: 'profile' | 'settings' | 'help' | 'auth') => {
    if (type === 'auth') setCurrentScreen('login');
    else if (type === 'settings') { setActiveModal(null); setCurrentScreen('settings'); }
    else if (type === 'help') { setActiveModal(null); setCurrentScreen('help'); }
    else setActiveModal(type);
  };

  const isSettingsOrHelp = ['settings', 'security', 'help', 'faq', 'guide', 'terms', 'support-chat'].includes(currentScreen);
  const showNavigation = currentScreen !== 'admin' && currentScreen !== 'verification' && currentScreen !== 'login' && currentScreen !== 'register' && !currentScreen.startsWith('employer-') && !isSettingsOrHelp;

  // Screens nobody may reach while logged out; in native mobile apps they bounce back to login.
  const isAuthGatedScreen = !isLoggedIn && !['login', 'register', 'faq', 'terms', 'help', 'guide'].includes(currentScreen);

  // The map is only reachable while logged in, so tie it to the session: on
  // logout it unmounts instead of idling, hidden.
  const shouldMountMap = isLoggedIn && !isEmployer && (hasOpenedMap || currentScreen === 'jobs');

  return (
    <div className={`flex flex-col md:flex-row bg-brand-background text-brand-text antialiased font-sans selection:bg-brand-primary-container selection:text-white ${
      currentScreen === 'admin' || (currentScreen.startsWith('employer-') && currentScreen !== 'employer-post') || currentScreen === 'messages' || currentScreen === 'chat'
        ? 'h-screen overflow-hidden'
        : 'min-h-screen'
    }`}>
      <a href="#main-content" className="skip-link">Asosiy kontentga o'tish</a>
      <ToastContainer />
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-semibold z-[9999] fixed top-0 w-full flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          Internet tarmog'iga ulanish yo'q. Iltimos, aloqani tekshiring!
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      {showNavigation && <Sidebar onOpenModal={handleOpenModal} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Header */}
        {showNavigation && <Header onOpenModal={handleOpenModal} />}

        {/* Sidebar Drawer Menu for Mobile view */}
        {showNavigation && <Drawer onOpenModal={handleOpenModal} />}

        {/* Main Content Layout */}
        <main id="main-content" tabIndex={-1} className={`flex-1 w-full min-w-0 ${['admin', 'jobs', 'messages', 'chat', 'verification', 'login', 'settings', 'security', 'help', 'faq', 'guide', 'terms', 'support-chat', 'profile', 'reviews', 'applications', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'jobs'].includes(currentScreen) ? 'max-w-none px-0 md:px-0' : 'max-w-7xl mx-auto px-4 md:px-6'}`}>
          {/* Keyed on the screen so a crashed screen's fallback clears as soon as
              the user navigates away. Only route content belongs in here. */}
          <ErrorBoundary key={currentScreen}>
            {/* If not logged in, and trying to access a protected screen, redirect to login */}
            {isAuthGatedScreen ? (
              <Navigate to="/login" replace />
            ) : isEmployer && currentScreen === 'jobs' ? (
              <Navigate to="/employer-dashboard" replace />
            ) : (
              currentScreen !== 'jobs' && <AppRoutes />
            )}
          </ErrorBoundary>

          {/* Persistently mounted map to avoid Leaflet re-initialization overhead. */}
          {shouldMountMap && (
            <ErrorBoundary>
              <div className={currentScreen === 'jobs' ? 'block' : 'hidden'}>
                <MapViewScreen />
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* Bottom Nav Bar (Mobile view only) */}
        {!isEmployer && showNavigation && <BottomNav />}
      </div>

      {/* Region selector fallback overlay for non-map screens */}
      {currentScreen !== 'jobs' && currentScreen !== 'login' && currentScreen !== 'register' && <RegionSelector />}

      {/* Menu item modal views */}
      <MenuModals isOpen={activeModal !== null} onClose={() => setActiveModal(null)} type={activeModal} />

      {/* Onboarding Tour for new users */}
      <OnboardingTour />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* reducedMotion="user" makes every motion.* component in the tree honor
          prefers-reduced-motion automatically, no per-component opt-in needed. */}
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <AppContent />
        </AppProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
