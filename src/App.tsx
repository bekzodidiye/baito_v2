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

const LandingScreen = React.lazy(() => import('./components/landing/LandingScreen').then(m => ({ default: m.LandingScreen })));
const JobSearchScreen = React.lazy(() => import('./components/search/JobSearchScreen').then(m => ({ default: m.JobSearchScreen })));
const CalendarScreen = React.lazy(() => import('./components/calendar/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const MessagesScreen = React.lazy(() => import('./components/messages/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const ChatScreen = React.lazy(() => import('./components/chat/ChatScreen').then(m => ({ default: m.ChatScreen })));
const NotificationsScreen = React.lazy(() => import('./components/notifications/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const ProfileScreen = React.lazy(() => import('./components/profile/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const VerificationPendingScreen = React.lazy(() => import('./components/login/VerificationPendingScreen').then(m => ({ default: m.VerificationPendingScreen })));
const SettingsScreen = React.lazy(() => import('./components/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const SecurityScreen = React.lazy(() => import('./components/settings/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const HelpScreen = React.lazy(() => import('./components/settings/HelpScreen').then(m => ({ default: m.HelpScreen })));
const FaqScreen = React.lazy(() => import('./components/settings/FaqScreen').then(m => ({ default: m.FaqScreen })));
const QollanmaScreen = React.lazy(() => import('./components/settings/QollanmaScreen').then(m => ({ default: m.QollanmaScreen })));
const ShartlarScreen = React.lazy(() => import('./components/settings/ShartlarScreen').then(m => ({ default: m.ShartlarScreen })));
const SupportChatScreen = React.lazy(() => import('./components/settings/SupportChatScreen').then(m => ({ default: m.SupportChatScreen })));
const LoginPromptScreen = React.lazy(() => import('./components/login/LoginPromptScreen').then(m => ({ default: m.LoginPromptScreen })));
const EmployerPanel = React.lazy(() => import('./features/employer/EmployerPanel').then(m => ({ default: m.EmployerPanel })));
const AdminPanel = React.lazy(() => import('./features/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));

const SuspenseFallback = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="animate-pulse w-8 h-8 rounded-full bg-slate-300"></div>
  </div>
);

function AppContent() {
  const { currentScreen, setCurrentScreen, toastMessage, isLoggedIn, userProfile, requireAuth } = useApp();
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

  // Global click interceptor: When user is not logged in, clicking restricted interactive elements redirects to login screen
  useEffect(() => {
    if (isLoggedIn) return;

    const handleGlobalGuestClick = (e: MouseEvent) => {
      if (currentScreen === 'login' || currentScreen === 'register') return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isAllowedForGuest = (el: HTMLElement | null) => {
        if (!el) return false;
        return !!(
          el.closest('[data-allow-guest="true"]') ||
          el.closest('.allow-guest') ||
          el.closest('[data-language-selector="true"]') ||
          el.closest('#language-selector-btn')
        );
      };

      if (isAllowedForGuest(target)) {
        return;
      }

      const clickable = target.closest(
        'button, a, [role="button"], input, select, textarea, .cursor-pointer, [onclick], .leaflet-interactive, [data-interactive="true"], article, nav'
      ) as HTMLElement | null;

      if (clickable) {
        if (isAllowedForGuest(clickable)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        requireAuth();
      }
    };

    window.addEventListener('click', handleGlobalGuestClick, true);
    return () => {
      window.removeEventListener('click', handleGlobalGuestClick, true);
    };
  }, [isLoggedIn, currentScreen, requireAuth]);

  const isToastSuccess = toastMessage
    ? toastMessage.toLowerCase().includes('muvaffaqiyatli') ||
      toastMessage.toLowerCase().includes('success') ||
      toastMessage.toLowerCase().includes('tasdiq') ||
      toastMessage.toLowerCase().includes('yuborildi') ||
      toastMessage.toLowerCase().includes('o\'qildi')
    : false;

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
      currentScreen === 'admin' || currentScreen.startsWith('employer-') || currentScreen === 'xabarlar' || currentScreen === 'chat'
        ? 'h-screen overflow-hidden'
        : 'min-h-screen'
    }`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-20 md:top-6 left-1/2 z-[99999] px-4 py-3 rounded-xl flex items-center gap-3 w-[90%] max-w-sm border ${
              isToastSuccess
                ? "bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] border-emerald-500/20"
                : "bg-slate-800 text-white shadow-[0_8px_30px_rgba(30,41,59,0.35)] border-slate-700/20"
            }`}
          >
            {isToastSuccess ? (
              <CheckCircle size={18} className="shrink-0 text-emerald-100" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-slate-300" />
            )}
            <p className="text-[13px] font-semibold leading-tight">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

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
            {currentScreen !== 'xarita' && (
              !isLoggedIn && !['landing', 'login', 'register', 'faq', 'shartlar', 'yordam', 'qollanma', 'qidiruv', 'xarita'].includes(currentScreen) ? (
                <GatedLockScreen onOpenAuth={() => setCurrentScreen('login')} />
              ) : (
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  <Route path="/" element={<LandingScreen />} />
                  <Route path="/landing" element={<LandingScreen />} />
                  <Route path="/qidiruv" element={<JobSearchScreen />} />
                  <Route path="/jobs/:id" element={<JobSearchScreen />} />
                  <Route path="/kalendar" element={<CalendarScreen />} />
                  <Route path="/xabarlar" element={<MessagesScreen />} />
                  <Route path="/chat" element={<ChatScreen />} />
                  <Route path="/chats/:id" element={<ChatScreen />} />
                  <Route path="/bildirishnomalar" element={<NotificationsScreen />} />
                  <Route path="/profil" element={<ProfileScreen />} />
                  <Route path="/yakunlash" element={<VerificationPendingScreen />} />
                  <Route path="/login" element={<LoginPromptScreen />} />
                  <Route path="/register" element={<LoginPromptScreen />} />
                  <Route path="/sozlamalar" element={<SettingsLayout><SettingsScreen /></SettingsLayout>} />
                  <Route path="/xavfsizlik" element={<SettingsLayout><SecurityScreen /></SettingsLayout>} />
                  <Route path="/yordam" element={<SettingsLayout><HelpScreen /></SettingsLayout>} />
                  <Route path="/faq" element={<SettingsLayout><FaqScreen /></SettingsLayout>} />
                  <Route path="/qollanma" element={<SettingsLayout><QollanmaScreen /></SettingsLayout>} />
                  <Route path="/shartlar" element={<SettingsLayout><ShartlarScreen /></SettingsLayout>} />
                  <Route path="/support-chat" element={<SettingsLayout><SupportChatScreen /></SettingsLayout>} />
                  
                  {/* Employer routes grouped */}
                  <Route path="/employer-dashboard" element={<EmployerPanel />} />
                  <Route path="/employer-jobs" element={<EmployerPanel />} />
                  <Route path="/employer-applicants" element={<EmployerPanel />} />
                  <Route path="/employer-chats" element={<EmployerPanel />} />
                  <Route path="/employer-profile" element={<EmployerPanel />} />
                  <Route path="/employer-analytics" element={<EmployerPanel />} />
                  <Route path="/employer-post" element={<EmployerPanel />} />
                  
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              )
            )}
            
            {/* Persistently mounted map to avoid Leaflet re-initialization overhead */}
            <div className={currentScreen === 'xarita' ? 'block' : 'hidden'}>
              <MapViewScreen />
            </div>
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
