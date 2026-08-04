import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { AdminStats, AdminUser, AdminJob, AdminTransaction, SystemSettings } from './types';
import { useApp } from '../../context/AppContext';

export function useAdminData() {
  const { } = useApp();
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    platformFeePercent: 10,
    minHourlyRate: 15000,
    maintenanceMode: false,
    autoApproveJobs: true,
    autoExpireJobs: true,
    autoExpireDays: 14,
    autoDeleteSpamJobs: true,
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, uData, jData, tData, tckData, cfgData] = await Promise.all([
        apiClient('/admin/stats').catch(() => null),
        apiClient('/admin/users').catch(() => null),
        apiClient('/admin/jobs').catch(() => null),
        apiClient('/admin/transactions').catch(() => null),
        apiClient('/admin/support-tickets').catch(() => null),
        apiClient('/admin/settings').catch(() => null),
      ]);

      if (sData) setStats(sData);
      if (Array.isArray(uData)) {
        setUsers(uData);
      }
      if (Array.isArray(jData)) setJobs(jData);
      if (Array.isArray(tData)) setTransactions(tData);
      if (Array.isArray(tckData)) setSupportTickets(tckData);
      if (cfgData) setSettings(cfgData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const showToast = (msg: string) => {
    (msg);
  };

  const addBalance = async (userId: string, amount: number) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (res !== undefined) { showToast(`Hisobga ${amount.toLocaleString()} UZS qo'shildi`); fetchAllData(); }
    } catch (e) { console.error(e); }
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

  const toggleBan = async (userId: string, currentBannedState?: boolean) => {
    try {
      const res = await apiClient(`/admin/users/${userId}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({ isBanned: !currentBannedState }),
      });
      if (res !== undefined) {
        (!currentBannedState ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi");
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
        ("E'lon holati o'zgardi");
        fetchAllData();
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
        ("E'lon o'chirib tashlandi");
        fetchAllData();
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
        const data = res;
        setSettings(data.settings);
        ("Tizim sozlamalari saqlandi");
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
        ("Ommaviy xabarnoma muvaffaqiyatli yuborildi");
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
    settings,
    refresh: fetchAllData,
    addBalance,
    changeRole,
    toggleBan,
    changeJobStatus,
    deleteJob,
    updateSettings,
    sendBroadcast,
  };
}
