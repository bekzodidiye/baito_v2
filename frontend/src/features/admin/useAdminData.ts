import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapList } from '../../api/client';
import { AdminStats, AdminUser, AdminJob, AdminTransaction, SystemSettings } from './types';

import { showToast as globalToast } from '../../utils/toast';

export function useAdminData() {

  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch: fetchAllData } = useQuery({
    queryKey: ['adminData'],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const endpoints = [
        apiClient('/admin/stats'),
        apiClient('/admin/users'),
        apiClient('/admin/jobs'),
        apiClient('/admin/transactions'),
        apiClient('/admin/support-tickets'),
        apiClient('/admin/settings'),
        apiClient('/admin/categories'),
        apiClient('/admin/regions'),
        apiClient('/admin/promotions'),
        apiClient('/admin/disputes'),
      ];

      const results = await Promise.allSettled(endpoints);

      const unpack = <T>(res: PromiseSettledResult<any>, name: string): T | null => {
        if (res.status === 'fulfilled') {
          return res.value as T;
        }
        console.warn(`[useAdminData] Failed to fetch ${name}:`, res.reason);
        return null;
      };

      const sData = unpack<AdminStats>(results[0], '/admin/stats');
      const uData = unpack<any>(results[1], '/admin/users');
      const jData = unpack<any>(results[2], '/admin/jobs');
      const tData = unpack<any>(results[3], '/admin/transactions');
      const tckData = unpack<any>(results[4], '/admin/support-tickets');
      const cfgData = unpack<SystemSettings>(results[5], '/admin/settings');
      const catData = unpack<any>(results[6], '/admin/categories');
      const regData = unpack<any>(results[7], '/admin/regions');
      const promoData = unpack<any>(results[8], '/admin/promotions');
      const dispData = unpack<any>(results[9], '/admin/disputes');

      return {
        stats: sData,
        users: unwrapList<AdminUser>(uData),
        jobs: unwrapList<AdminJob>(jData),
        transactions: unwrapList<AdminTransaction>(tData),
        supportTickets: unwrapList<any>(tckData),
        categories: unwrapList<any>(catData),
        regions: unwrapList<any>(regData),
        promotions: unwrapList<any>(promoData),
        disputes: unwrapList<any>(dispData),
        settings: cfgData || {
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
    telegramDigestEnabled: false,
    telegramDigestChannel: null,
    matchMinScore: 80,
    matchMaxDistanceKm: 15,
    matchMinWorkerRating: 0,
  };

  // This was `(msg);` — the message was built and thrown away, so every
  // confirmation and every failure in the admin panel was silent.
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    globalToast(msg, type);
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
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Balansni o'zgartirib bo'lmadi", 'error');
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (res !== undefined) { showToast("Foydalanuvchi roli yangilandi"); fetchAllData(); }
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    }
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
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
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
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
    }
  };

  const approveJob = async (jobId: string) => {
    try {
      const res = await apiClient(`/admin/jobs/${jobId}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res !== undefined) {
        showToast("E'lon tasdiqlandi va faol holatga o'tkazildi!", 'success');
        fetchAllData();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Tasdiqlab bo'lmadi", 'error');
    }
  };

  const rejectJob = async (jobId: string, reason?: string) => {
    try {
      const res = await apiClient(`/admin/jobs/${jobId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (res !== undefined) {
        showToast("E'lon rad etildi", 'info');
        fetchAllData();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Rad etib bo'lmadi", 'error');
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
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
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
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
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
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
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
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'error');
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
    approveJob,
    rejectJob,
    changeJobWorker,
    deleteJob,
    updateSettings,
    sendBroadcast,
  };
}
