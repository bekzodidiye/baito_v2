import React, { useState } from 'react';
import { AdminTab } from './types';
import { useAdminData } from './useAdminData';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminJobs } from './AdminJobs';
import { AdminVerifications } from './AdminVerifications';
import { AdminTransactions } from './AdminTransactions';
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
import { AdminAutoEscrowDocs } from './AdminAutoEscrowDocs';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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
    deleteJob,
    updateSettings,
    sendBroadcast,
  } = useAdminData();

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex overflow-hidden w-full">
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
          {activeTab === 'overview' && (
            <AdminOverview stats={stats} loading={loading} />
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
            />
          )}

          {activeTab === 'verifications' && (
            <AdminVerifications users={users} onRefresh={refresh} />
          )}

          {activeTab === 'disputes' && (
            <AdminDisputes />
          )}

          {activeTab === 'transactions' && (
            <AdminTransactions transactions={transactions} />
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

          {activeTab === 'notification_rules' && (
            <AdminNotificationRules />
          )}

          {activeTab === 'auto_moderation' && (
            <AdminAutoModeration />
          )}

          {activeTab === 'auto_matching' && (
            <AdminAutoMatching />
          )}

          {activeTab === 'auto_reports' && (
            <AdminAutoReports />
          )}

          {activeTab === 'auto_escrow_docs' && (
            <AdminAutoEscrowDocs />
          )}

          {activeTab === 'settings' && (
            <AdminSettings settings={settings} onUpdateSettings={updateSettings} />
          )}
        </main>
      </div>
    </div>
  );
};
