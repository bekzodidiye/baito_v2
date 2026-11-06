import { NotificationsScreen } from '../../components/notifications/NotificationsScreen';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminTab } from './types';
import { adminPath, tabFromSlug, DEFAULT_ADMIN_TAB } from './adminTabs';
import { useAdminData } from './useAdminData';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminJobs } from './AdminJobs';
import { AdminDailyJobs } from './AdminDailyJobs';
import { AdminVerifications } from './AdminVerifications';
import { AdminTransactions } from './AdminTransactions';
import { AdminPayouts } from './AdminPayouts';
import { AdminDisputes } from './AdminDisputes';
import { AdminBroadcast } from './AdminBroadcast';
import { AdminSettings } from './AdminSettings';
import { AdminSupport } from './AdminSupport';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminCategories } from './AdminCategories';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminPromotions } from './AdminPromotions';
import { AdminRegions } from './AdminRegions';
import { AdminNotificationRules } from './AdminNotificationRules';
import { AdminAutoModeration } from './AdminAutoModeration';
import { AdminAutoMatching } from './AdminAutoMatching';
import { AdminAutoReports } from './AdminAutoReports';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export const AdminPanel: React.FC = () => {
  // The URL is the tab. Every section is its own address, so it can be linked
  // to, bookmarked and survive a reload; `back` moves between sections rather
  // than leaving the panel.
  const { tab: tabSlug } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab = tabFromSlug(tabSlug) ?? DEFAULT_ADMIN_TAB;
  const setActiveTab = React.useCallback(
    (tab: AdminTab) => navigate(adminPath(tab)),
    [navigate],
  );

  // A slug nobody recognises is a typo or a stale link, not a blank panel.
  React.useEffect(() => {
    if (tabSlug && !tabFromSlug(tabSlug)) {
      navigate(adminPath(DEFAULT_ADMIN_TAB), { replace: true });
    }
  }, [tabSlug, navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const {
    loading,
    stats,
    users,
    jobs,
    transactions,
    supportTickets,
    settings,
    refresh,
    addBalance,
    changeRole,
    toggleBan,
    changeJobStatus,
    approveJob,
    rejectJob,
    changeJobWorker,
    deleteJob,
    updateSettings,
    sendBroadcast,
  } = useAdminData();

  return (
    <div className="h-screen bg-brand-background text-slate-900 flex overflow-hidden w-full antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          activeTab={activeTab}
          onRefresh={refresh}
          loading={loading}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary key={activeTab}>
            {activeTab === 'overview' && (
              <AdminOverview stats={stats} loading={loading} onNavigate={setActiveTab} />
            )}

            {activeTab === 'users' && (
              <AdminUsers
                users={users}
                onAddBalance={addBalance}
                onChangeRole={changeRole}
                onToggleBan={toggleBan}
              />
            )}

            {activeTab === 'jobs' && (
              <AdminJobs
                jobs={jobs}
                onChangeJobStatus={changeJobStatus}
                onDeleteJob={deleteJob}
                onApproveJob={approveJob}
                onRejectJob={rejectJob}
              />
            )}

            {activeTab === 'daily_jobs' && (
              <AdminDailyJobs
                jobs={jobs}
                users={users}
                onChangeJobStatus={changeJobStatus}
                onChangeJobWorker={changeJobWorker}
                onDeleteJob={deleteJob}
                onAddBalance={addBalance}
                onChangeRole={changeRole}
                onToggleBan={toggleBan}
                onApproveJob={approveJob}
                onRejectJob={rejectJob}
              />
            )}

            {activeTab === 'verifications' && (
              <AdminVerifications users={users} onRefresh={refresh} />
            )}

            {activeTab === 'disputes' && (
              <AdminDisputes />
            )}

            {activeTab === 'transactions' && (
              <AdminTransactions transactions={transactions} onRefresh={refresh} />
            )}

            {activeTab === 'payouts' && (
              <AdminPayouts />
            )}

            {activeTab === 'support' && (
              <AdminSupport supportTickets={supportTickets} />
            )}

            {activeTab === 'broadcast' && (
              <AdminBroadcast onSendBroadcast={sendBroadcast} />
            )}

            {activeTab === 'analytics' && (
              <AdminAnalytics />
            )}

            {activeTab === 'categories' && (
              <AdminCategories />
            )}

            {activeTab === 'audit_logs' && (
              <AdminAuditLogs />
            )}

            {activeTab === 'promotions' && (
              <AdminPromotions />
            )}

            {activeTab === 'regions' && (
              <AdminRegions />
            )}

            {/* The inbox. notification_rules below it configures when messages go
                out; this is where an admin reads the ones addressed to them. It
                is the same component the worker and employer panels render at
                /notifications - it takes no props and carries its own data. */}
            {activeTab === 'notifications' && (
              <NotificationsScreen />
            )}

            {activeTab === 'notification_rules' && (
              <AdminNotificationRules settings={settings} onUpdateSettings={updateSettings} />
            )}

            {activeTab === 'auto_moderation' && (
              <AdminAutoModeration settings={settings} onUpdateSettings={updateSettings} />
            )}

            {activeTab === 'auto_matching' && (
              <AdminAutoMatching settings={settings} onUpdateSettings={updateSettings} />
            )}

            {activeTab === 'auto_reports' && (
              <AdminAutoReports stats={stats} settings={settings} onUpdateSettings={updateSettings} />
            )}


            {activeTab === 'settings' && (
              <AdminSettings settings={settings} onUpdateSettings={updateSettings} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
