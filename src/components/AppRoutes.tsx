import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsLayout } from './settings/SettingsLayout';

const LandingScreen = React.lazy(() => import('./landing/LandingScreen').then(m => ({ default: m.LandingScreen })));
const JobSearchScreen = React.lazy(() => import('../features/worker/search/JobSearchScreen').then(m => ({ default: m.JobSearchScreen })));
const CalendarScreen = React.lazy(() => import('../features/worker/calendar/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const MessagesScreen = React.lazy(() => import('./messages/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const ChatScreen = React.lazy(() => import('./chat/ChatScreen').then(m => ({ default: m.ChatScreen })));
const NotificationsScreen = React.lazy(() => import('./notifications/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const ProfileScreen = React.lazy(() => import('../features/worker/profile/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const ApplicationsScreen = React.lazy(() => import('../features/worker/applications/ApplicationsScreen').then(m => ({ default: m.ApplicationsScreen })));
const VerificationPendingScreen = React.lazy(() => import('./login/VerificationPendingScreen').then(m => ({ default: m.VerificationPendingScreen })));
const SettingsScreen = React.lazy(() => import('./settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const SecurityScreen = React.lazy(() => import('./settings/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const HelpScreen = React.lazy(() => import('./settings/HelpScreen').then(m => ({ default: m.HelpScreen })));
const FaqScreen = React.lazy(() => import('./settings/FaqScreen').then(m => ({ default: m.FaqScreen })));
const QollanmaScreen = React.lazy(() => import('./settings/QollanmaScreen').then(m => ({ default: m.QollanmaScreen })));
const ShartlarScreen = React.lazy(() => import('./settings/ShartlarScreen').then(m => ({ default: m.ShartlarScreen })));
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

import { useApp } from '../context/AppContext';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isLoggedIn, userProfile } = useApp();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(userProfile?.selectedRole || 'worker')) {
    if (userProfile?.selectedRole === 'employer') return <Navigate to="/employer-dashboard" replace />;
    if (userProfile?.selectedRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/jobs" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
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
        <Route path="/verification" element={<ProtectedRoute><VerificationPendingScreen /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPromptScreen initialMode="login" />} />
        <Route path="/register" element={<LoginPromptScreen initialMode="register" />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsLayout><SettingsScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><SettingsLayout><SecurityScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><SettingsLayout><HelpScreen /></SettingsLayout></ProtectedRoute>} />
        <Route path="/faq" element={<SettingsLayout><FaqScreen /></SettingsLayout>} />
        <Route path="/guide" element={<SettingsLayout><QollanmaScreen /></SettingsLayout>} />
        <Route path="/terms" element={<SettingsLayout><ShartlarScreen /></SettingsLayout>} />
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
