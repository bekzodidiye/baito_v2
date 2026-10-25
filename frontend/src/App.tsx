import { ToastContainer } from './components/ToastContainer';
import { NotificationWatcher } from './components/notifications/NotificationWatcher';
import React, { useState, useEffect, Suspense } from 'react';
import {   Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
const MapViewScreen = React.lazy(() => import('./components/map/MapViewScreen').then(m => ({ default: m.MapViewScreen })));
import { MapLoadingSkeleton } from './components/map/MapLoadingSkeleton';
import { RegionSelector } from './components/RegionSelector';
import { MenuModals } from './components/MenuModals';
import { OnboardingTour } from './components/OnboardingTour';
import { MotionConfig } from 'motion/react';
import { AlertCircle } from 'lucide-react';

import { AppRoutes } from './components/AppRoutes';
import { useCurrentScreen } from './hooks/useCurrentScreen';
import { translations } from './translations';
import { useUIStore } from "./store/useUIStore";
import { useAuthStore } from "./store/useAuthStore";


function AppContent() {
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const userProfile = useAuthStore(s => s.userProfile);
    const requireAuth = useApp().requireAuth;
    const jobsView = useUIStore(s => s.jobsView);
    const language = useAuthStore(s => s.language);
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
    if (currentScreen === 'jobs' && jobsView === 'map') {
      setHasOpenedMap(true);
    }

    // Scroll window to top when navigating
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also scroll the main container if it has independent scrolling
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [currentScreen, jobsView]);


  
  const handleOpenModal = (type: 'profile' | 'settings' | 'help' | 'auth') => {
    if (type === 'auth') setCurrentScreen('login');
    else if (type === 'settings') { setActiveModal(null); setCurrentScreen('settings'); }
    else if (type === 'help') { setActiveModal(null); setCurrentScreen('help'); }
    else setActiveModal(type);
  };

  const isSettingsOrHelp = ['settings', 'security', 'help', 'faq', 'guide', 'terms', 'privacy', 'support-chat'].includes(currentScreen);
  const showNavigation = currentScreen !== 'admin' && currentScreen !== 'verification' && currentScreen !== 'login' && currentScreen !== 'register' && currentScreen !== 'landing' && !currentScreen.startsWith('employer-') && !isSettingsOrHelp;

  // The settings screens kept the app's own rail hidden and offered a "back to
  // main menu" button in its place, which is why they read as a separate site
  // on a desktop rather than a page of this one. They get the rail back.
  //
  // Only the rail. Sidebar is `hidden md:flex`, so this changes nothing below
  // md - and Header and Drawer stay on the original condition on purpose,
  // because SettingsScreen draws its own `md:hidden` header and two of them
  // would stack.
  const showSidebar = showNavigation || isSettingsOrHelp;

  // Screens nobody may reach while logged out; they bounce back to the landing.
  const isAuthGatedScreen = !isLoggedIn && !['landing', 'login', 'register', 'faq', 'terms', 'help', 'guide'].includes(currentScreen);

  // The map is only reachable while logged in, and unmounts on other screens to save memory on low-end devices.
  const shouldMountMap = isLoggedIn && !isEmployer && currentScreen === 'jobs' && (hasOpenedMap || jobsView === 'map');

  return (
    <div className={`flex flex-col md:flex-row bg-brand-background text-brand-text antialiased font-sans selection:bg-brand-primary-container selection:text-white ${
      currentScreen === 'admin' || (currentScreen.startsWith('employer-') && currentScreen !== 'employer-post') || currentScreen === 'messages' || currentScreen === 'chat' || currentScreen === 'support-chat'
        ? 'h-screen overflow-hidden'
        : 'min-h-screen'
    }`}>
      <a href="#main-content" className="skip-link">{translations[language].skipToContent}</a>
      <ToastContainer />
      {/* Watches for notifications on every screen, not just the list. */}
      <NotificationWatcher />
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-semibold z-[9999] fixed top-0 w-full flex items-center justify-center gap-2">
          <AlertCircle size={16} />
          Internet tarmog'iga ulanish yo'q. Iltimos, aloqani tekshiring!
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      {showSidebar && <Sidebar onOpenModal={handleOpenModal} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Header */}
        {showNavigation && <Header onOpenModal={handleOpenModal} />}

        {/* Sidebar Drawer Menu for Mobile view */}
        {showNavigation && <Drawer onOpenModal={handleOpenModal} />}

        {/* Main Content Layout */}
        <main id="main-content" tabIndex={-1} className={`flex-1 w-full min-w-0 ${['landing', 'admin', 'jobs', 'messages', 'chat', 'verification', 'login', 'settings', 'security', 'help', 'faq', 'guide', 'terms', 'privacy', 'support-chat', 'profile', 'reviews', 'applications', 'employer-dashboard', 'employer-jobs', 'employer-applicants', 'employer-chats', 'employer-profile', 'employer-analytics', 'employer-post', 'jobs'].includes(currentScreen) ? 'max-w-none px-0 md:px-0' : 'max-w-7xl mx-auto px-4 md:px-6'}`}>
          {/* Keyed on the screen so a crashed screen's fallback clears as soon as
              the user navigates away. Only route content belongs in here. */}
          <ErrorBoundary key={currentScreen}>
            {/* If not logged in, and trying to access a protected screen, redirect to landing */}
            {isAuthGatedScreen ? (
              <Navigate to="/" replace />
            ) : isEmployer && currentScreen === 'jobs' ? (
              <Navigate to="/employer-dashboard" replace />
            ) : (
              // The map replaces the routed content on the jobs screen, so the
              // list — and with it the search box and every filter — only
              // renders when the header's toggle asks for it.
              (currentScreen !== 'jobs' || jobsView === 'list') && <AppRoutes />
            )}
          </ErrorBoundary>

          {/* Persistently mounted map to avoid Leaflet re-initialization overhead.
              It sits outside the keyed boundary on purpose: a key that changes on
              every navigation would destroy and rebuild the Leaflet instance each
              time, which is exactly what mounting it here is meant to avoid.
              However, it unmounts when leaving the jobs screen to prevent memory leaks. */}
          {shouldMountMap && (
            <ErrorBoundary>
              <div className={currentScreen === 'jobs' && jobsView === 'map' ? 'block' : 'hidden'}>
                <Suspense fallback={<MapLoadingSkeleton />}>
                  <MapViewScreen />
                </Suspense>
              </div>
            </ErrorBoundary>
          )}
        </main>

        {/* Bottom Nav Bar (Mobile view only) */}
        {!isEmployer && showNavigation && <BottomNav />}
      </div>

      {/* Region selector fallback overlay for non-map screens */}
      {currentScreen !== 'jobs' && currentScreen !== 'landing' && <RegionSelector />}

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
