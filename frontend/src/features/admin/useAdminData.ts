import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapList } from '../../api/client';
import { AdminStats, AdminUser, AdminJob, AdminTransaction, SystemSettings } from './types';
import { useApp } from '../../context/AppContext';
import { showToast as globalToast } from '../../utils/toast';

export function useAdminData() {
  const { } = useApp();
  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch: fetchAllData } = useQuery({
    queryKey: ['adminData'],
    queryFn: async () => {
      const [sData, uData, jData, tData, tckData, cfgData, catData, regData, promoData, dispData] = await Promise.all([
        apiClient('/admin/stats').catch(() => null),
        apiClient('/admin/users').catch(() => null),
        apiClient('/admin/jobs').catch(() => null),
        apiClient('/admin/transactions').catch(() => null),
        apiClient('/admin/support-tickets').catch(() => null),
        apiClient('/admin/settings').catch(() => null),
        apiClient('/admin/categories').catch(() => null),
        apiClient('/admin/regions').catch(() => null),
        apiClient('/admin/promotions').catch(() => null),
        apiClient('/admin/disputes').catch(() => null),
      ]);
      return {
        stats: sData as AdminStats | null,
        users: unwrapList<AdminUser>(uData),
        jobs: unwrapList<AdminJob>(jData),
        transactions: unwrapList<AdminTransaction>(tData),
        supportTickets: unwrapList<any>(tckData),
        categories: unwrapList<any>(catData),
        regions: unwrapList<any>(regData),
        promotions: unwrapList<any>(promoData),
        disputes: unwrapList<any>(dispData),
        settings: cfgData as SystemSettings || {
          platformFeePercent: 10,
          minHourlyRate: 15000,
          maintenanceMode: false,
          autoApproveJobs: true,
          autoExpireJobs: true,
          autoExpireDays: 14,
          autoDeleteSpamJobs: true,
        }
      };
    }
  });

  const stats = data?.stats || null;
  const users = data?.users || [];
  const jobs = data?.jobs || [];
  const transactions = data?.transactions || [];
  const supportTickets = data?.supportTickets || [];
  const categories = data?.categories || [];
  const regions = data?.regions || [];
  const promotions = data?.promotions || [];
  const disputes = data?.disputes || [];
  const settings = data?.settings || {
    platformFeePercent: 10,
    minHourlyRate: 15000,
    maintenanceMode: false,
    autoApproveJobs: true,
    autoExpireJobs: true,
    autoExpireDays: 14,
    autoDeleteSpamJobs: true,
    spamKeywords: null,
    spamAutoFineAmount: 0,
    spamAutoBanHours: 0,
    escrowAutoReleaseEnabled: false,
    escrowAutoReleaseHours: 24,
    telegramDigestEnabled: false,
    telegramDigestChannel: null,
    matchMinScore: 80,
    matchMaxDistanceKm: 15,
    matchMinWorkerRating: 0,
  };

  // This was `(msg);` — the message was built and thrown away, so every
  // confirmation and every failure in the admin panel was silent.
  const showToast = (msg: string) => {
    globalToast(msg);
  };

  // The header's refresh button only ever refetched this hook's own
  // plain-fetch data. Screens built on useQuery (AdminPayouts, AdminAuditLogs)
  // have their own cache keys this never touched, so their "refresh" button
  // did nothing for admins who happened to be on one of those screens.
  const refreshAll = () => {
    queryClient.invalidateQueries();
  };

  const addBalance = async (userId: string, amount: number, reason: string) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason }),
      });
      if (res !== undefined) { showToast(`Hisobga ${amount.toLocaleString()} UZS qo'shildi`); fetchAllData(); }
    } catch (e) {
      console.error(e);
      showToast("Balansni o'zgartirib bo'lmadi");
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (res !== undefined) { showToast("Foydalanuvchi roli yangilandi"); fetchAllData(); }
    } catch (e) { console.error(e); }
  };

  const toggleBan = async (userId: string, currentBannedState?: boolean, reason?: string) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/ban`, {
        method: 'PATCH',
        // The endpoint records `reason` on the admin action, and the ban
        // dialog has always collected one — it just never left the browser.
        body: JSON.stringify({ isBanned: !currentBannedState, reason: reason || undefined }),
      });
      if (res !== undefined) {
        showToast(!currentBannedState ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi");
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeJobStatus = async (jobId: string, status: string) => {
    try {
      const res = await apiClient(`/admin/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res !== undefined) {
        showToast("E'lon holati o'zgardi");
        fetchAllData();
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeJobWorker = async (jobId: string, workerId: string | null) => {
    try {
      const res = await apiClient(`/admin/jobs/${jobId}/worker`, {
        method: 'PATCH',
        body: JSON.stringify({ workerId }),
      });
      if (res !== undefined) {
        fetchAllData();
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const res = await apiClient(`/admin/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (res !== undefined) {
        showToast("E'lon o'chirib tashlandi");
        fetchAllData();
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateSettings = async (newCfg: Partial<SystemSettings>) => {
    try {
      const res = await apiClient('/admin/settings', {
        method: 'POST',
        body: JSON.stringify(newCfg),
      });
      if (res !== undefined) {
        fetchAllData();
        showToast("Tizim sozlamalari saqlandi");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendBroadcast = async (title: string, message: string, targetRole: string) => {
    try {
      const res = await apiClient('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message, targetRole }),
      });
      if (res !== undefined) {
        showToast("Ommaviy xabarnoma muvaffaqiyatli yuborildi");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    loading,
    stats,
    users,
    jobs,
    transactions,
    supportTickets,
    categories,
    regions,
    promotions,
    disputes,
    settings,
    refresh: refreshAll,
    addBalance,
    changeRole,
    toggleBan,
    changeJobStatus,
    changeJobWorker,
    deleteJob,
    updateSettings,
    sendBroadcast,
  };
}
