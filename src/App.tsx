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
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { AppRoutes } from './components/AppRoutes';
import { useCurrentScreen } from './hooks/useCurrentScreen';

function AppContent() {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { isLoggedIn, userProfile, requireAuth } = useApp();
  const [hasOpenedMap, setHasOpenedMap] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'help' | 'auth' | null>(null);

  const isEmployer = isLoggedIn && userProfile?.selectedRole === 'employer';

  useEffect(() => {
    if (currentScreen === 'xarita') {
      setHasOpenedMap(true);
    }

    // Scroll window and all inner scrollable containers to top when navigating to any page
    const resetAllScrolls = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const scrollables = document.querySelectorAll<HTMLElement>(
        'main, [class*="overflow-y-auto"], [class*="overflow-auto"], #settings-layout-wrapper > div'
      );
      scrollables.forEach((el) => {
        el.scrollTop = 0;
      });
    };

    resetAllScrolls();
    const rafId = requestAnimationFrame(resetAllScrolls);
    const timeoutId = setTimeout(resetAllScrolls, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [currentScreen]);


  
  const handleOpenModal = (type: 'profile' | 'settings' | 'help' | 'auth') => {
    if (type === 'auth') setCurrentScreen('login');
    else if (type === 'settings') { setActiveModal(null); setCurrentScreen('sozlamalar'); }
    else if (type === 'help') { setActiveModal(null); setCurrentScreen('yordam'); }
    else setActiveModal(type);
  };

  const isSettingsOrHelp = ['sozlamalar', 'xavfsizlik', 'yordam', 'faq', 'qollanma', 'shartlar', 'support-chat'].includes(currentScreen);
  const showNavigation = currentScreen !== 'admin' && currentScreen !== 'yakunlash' && currentScreen !== 'login' && currentScreen !== 'register' && currentScreen !== 'landing' && !currentScreen.startsWith('employer-') && !isSettingsOrHelp;

  const shouldMountMap = hasOpenedMap || currentScreen === 'xarita';

  return (
    <div className={`flex flex-col md:flex-row bg-brand-background text-brand-text antialiased font-sans selection:bg-brand-primary-container selection:text-white ${
      currentScreen === 'admin' || (currentScreen.startsWith('employer-') && currentScreen !== 'employer-post') || currentScreen === 'xabarlar' || currentScreen === 'chat'
        ? 'h-screen overflow-hidden'
        : 'min-h-screen'
    }`}>
      <ToastContainer />

      {/* Desktop Permanent Sidebar */}
      {showNavigation && <Sidebar onOpenModal={handleOpenModal} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Header */}
        {showNavigation && <Header onOpenModal={handleOpenModal} />}

        {/* Sidebar Drawer Menu for Mobile view */}
        {showNavigation && <Drawer onOpenModal={handleOpenModal} />}

        {/* Main Content Layout */}
        <main className={`flex-1 w-full min-w-0 ${['landing', 'admin', 'xarita', 'xabarlar', 'chat', 'yakunlash', 'login', 'sozlamalar', 'xavfsizlik', 'yordam', 'faq', 'qollanma', 'shartlar', 'support-chat', 'profil', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'qidiruv'].includes(currentScreen) ? 'max-w-none px-0 md:px-0' : 'max-w-7xl mx-auto px-4 md:px-6'}`}>
          <ErrorBoundary key={currentScreen}>
            {/* If not logged in, and trying to access a protected screen, redirect to landing */}
            {!isLoggedIn && !['landing', 'login', 'register', 'faq', 'shartlar', 'yordam', 'qollanma'].includes(currentScreen) ? (
              <Navigate to="/" replace />
            ) : (
              <>
                {currentScreen !== 'xarita' && <AppRoutes />}
                
                {/* Persistently mounted map to avoid Leaflet re-initialization overhead */}
                <div className={currentScreen === 'xarita' ? 'block' : 'hidden'}>
                  <MapViewScreen />
                </div>
              </>
            )}
          </ErrorBoundary>
        </main>

        {/* Bottom Nav Bar (Mobile view only) */}
        {!isEmployer && showNavigation && <BottomNav />}
      </div>

      {/* Region selector fallback overlay for non-map screens */}
      {currentScreen !== 'xarita' && currentScreen !== 'landing' && <RegionSelector />}

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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
