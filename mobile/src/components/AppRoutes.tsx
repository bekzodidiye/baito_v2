import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsLayout } from './settings/SettingsLayout';
import { useApp } from '../context/AppContext';

const JobSearchScreen = React.lazy(() => import('../features/worker/search/JobSearchScreen').then(m => ({ default: m.JobSearchScreen })));
const CalendarScreen = React.lazy(() => import('../features/worker/calendar/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const MessagesScreen = React.lazy(() => import('./messages/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const ChatScreen = React.lazy(() => import('./chat/ChatScreen').then(m => ({ default: m.ChatScreen })));
const NotificationsScreen = React.lazy(() => import('./notifications/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const ProfileScreen = React.lazy(() => import('../features/worker/profile/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const ApplicationsScreen = React.lazy(() => import('../features/worker/applications/ApplicationsScreen').then(m => ({ default: m.ApplicationsScreen })));
const ReviewsScreen = React.lazy(() => import('../features/worker/profile/ReviewsScreen').then(m => ({ default: m.ReviewsScreen })));
const PaymentsScreen = React.lazy(() => import('../features/payments/PaymentsScreen').then(m => ({ default: m.PaymentsScreen })));
const MyCardsScreen = React.lazy(() => import('../features/payments/MyCardsScreen').then(m => ({ default: m.MyCardsScreen })));
const AddCardScreen = React.lazy(() => import('../features/payments/AddCardScreen').then(m => ({ default: m.AddCardScreen })));
const TopUpScreen = React.lazy(() => import('../features/payments/TopUpScreen').then(m => ({ default: m.TopUpScreen })));
const PaymentResult = React.lazy(() => import('../features/worker/profile/PaymentResult').then(m => ({ default: m.PaymentResult })));
const TaxesScreen = React.lazy(() => import('../features/worker/profile/TaxesScreen').then(m => ({ default: m.TaxesScreen })));
const VerificationPendingScreen = React.lazy(() => import('./login/VerificationPendingScreen').then(m => ({ default: m.VerificationPendingScreen })));
const SettingsScreen = React.lazy(() => import('./settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const SecurityScreen = React.lazy(() => import('./settings/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const HelpScreen = React.lazy(() => import('./settings/HelpScreen').then(m => ({ default: m.HelpScreen })));
const FaqScreen = React.lazy(() => import('./settings/FaqScreen').then(m => ({ default: m.FaqScreen })));
const QollanmaScreen = React.lazy(() => import('./settings/QollanmaScreen').then(m => ({ default: m.QollanmaScreen })));
const ShartlarScreen = React.lazy(() => import('./settings/ShartlarScreen').then(m => ({ default: m.ShartlarScreen })));
const PrivacyScreen = React.lazy(() => import('./settings/PrivacyScreen').then(m => ({ default: m.PrivacyScreen })));
const SupportChatScreen = React.lazy(() => import('./settings/SupportChatScreen').then(m => ({ default: m.SupportChatScreen })));
const LoginPromptScreen = React.lazy(() => import('./login/LoginPromptScreen').then(m => ({ default: m.LoginPromptScreen })));
const EmployerPanel = React.lazy(() => import('../features/employer/EmployerPanel').then(m => ({ default: m.EmployerPanel })));
const NotFoundScreen = React.lazy(() => import('./NotFoundScreen').then(m => ({ default: m.NotFoundScreen })));
const AdminPanel = React.lazy(() => import('../features/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));

const SuspenseFallback = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="animate-pulse w-8 h-8 rounded-full bg-slate-300"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isLoggedIn, userProfile } = useApp();
  
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  
  if (isLoggedIn && !userProfile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(userProfile?.selectedRole || 'worker')) {
    if (userProfile?.selectedRole === 'employer') return <Navigate to="/employer-dashboard" replace />;
    if (userProfile?.selectedRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/jobs" replace />;
  }
  return <>{children}</>;
};

const RootRedirect = () => {
  const { isLoggedIn, userProfile } = useApp();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userProfile?.selectedRole === 'employer') return <Navigate to="/employer-dashboard" replace />;
  if (userProfile?.selectedRole === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/jobs" replace />;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* Root entry point - Native Mobile Apps redirect directly to main feed / login */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Worker routes */}
        <Route path="/jobs" element={<ProtectedRoute allowedRoles={['worker']}><JobSearchScreen /></ProtectedRoute>} />
        <Route path="/jobs/:id" element={<ProtectedRoute allowedRoles={['worker']}><JobSearchScreen /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute allowedRoles={['worker']}><CalendarScreen /></ProtectedRoute>} />

        {/* Shared logged in routes */}
        <Route path="/messages" element={<ProtectedRoute><MessagesScreen /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
        <Route path="/chats/:id" element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['worker']}><ProfileScreen /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute allowedRoles={['worker']}><ApplicationsScreen /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute allowedRoles={['worker']}><ReviewsScreen /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedRoles={['worker', 'employer']}><PaymentsScreen /></ProtectedRoute>} />
        <Route path="/payments/my-cards" element={<ProtectedRoute allowedRoles={['worker', 'employer']}><MyCardsScreen /></ProtectedRoute>} />
        <Route path="/payments/add-card" element={<ProtectedRoute allowedRoles={['worker', 'employer']}><AddCardScreen /></ProtectedRoute>} />
        <Route path="/payments/top-up" element={<ProtectedRoute allowedRoles={['worker', 'employer']}><TopUpScreen /></ProtectedRoute>} />
        <Route path="/payments/success" element={<ProtectedRoute allowedRoles={['worker']}><PaymentResult /></ProtectedRoute>} />
        <Route path="/payments/error" element={<ProtectedRoute allowedRoles={['worker']}><PaymentResult /></ProtectedRoute>} />
        <Route path="/taxes" element={<ProtectedRoute allowedRoles={['worker']}><TaxesScreen /></ProtectedRoute>} />
        <Route path="/verification" element={<ProtectedRoute><VerificationPendingScreen /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPromptScreen initialMode="login" />} />
        <Route path="/register" element={<LoginPromptScreen initialMode="register" />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsLayout><SettingsScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><SettingsLayout><SecurityScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><SettingsLayout><HelpScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/faq" element={<SettingsLayout><FaqScreen /></SettingsLayout>} />
        <Route path="/guide" element={<SettingsLayout><QollanmaScreen /></SettingsLayout>} />
        <Route path="/terms" element={<SettingsLayout><ShartlarScreen /></SettingsLayout>} />
        <Route path="/privacy" element={<SettingsLayout><PrivacyScreen /></SettingsLayout>} />
        <Route path="/support-chat" element={<ProtectedRoute><SettingsLayout><SupportChatScreen /></SettingsLayout></ProtectedRoute>} />
        
        {/* Employer routes grouped */}
        <Route path="/employer-dashboard" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-jobs" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-applicants" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-chats" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-profile" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-analytics" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        <Route path="/employer-post" element={<ProtectedRoute allowedRoles={['employer']}><EmployerPanel /></ProtectedRoute>} />
        
        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </Suspense>
  );
};
