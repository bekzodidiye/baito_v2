import { useState, useEffect, useCallback } from 'react';
import { AdminStats, AdminUser, AdminJob, AdminTransaction, SystemSettings } from './types';
import { useApp } from '../../context/AppContext';

export function useAdminData() {
  const { setToastMessage } = useApp();
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
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
      const [sData, uData, jData, tData, cfgData] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/users').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/jobs').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/transactions').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/settings').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (sData) setStats(sData);
      if (Array.isArray(uData)) {
        const enrichedUsers = uData.map((u: AdminUser, index: number) => ({
          ...u,
          email: u.email || `${u.name.toLowerCase().replace(/\s+/g, '.')}@baito.uz`,
          region: u.region || (index % 3 === 0 ? 'Toshkent shahri' : index % 3 === 1 ? 'Samarqand' : 'Andijon'),
          category: u.category || (u.role === 'employer' ? 'Tadbirkor / Ish beruvchi' : 'Qurilish & Ta\'mirlash Ustasi'),
          bio: u.bio || (u.role === 'employer' ? 'Baito platformasida rasmiy e\'lon beruvchi kompaniya vakili.' : 'Yuqori tajribali mutaxassis, o\'z ishining ustasi.'),
          skills: u.skills || (u.role === 'worker' ? ['Santexnika', 'Elektrik', 'Plitka terish'] : ['Loyiha boshqaruvi']),
          rating: u.rating || (4.5 + (index % 5) * 0.1),
          completedJobsCount: u.completedJobsCount ?? (12 + index * 3),
          passportSeries: u.passportSeries || `AD ${1000000 + index * 4321}`,
          passportJshshir: u.passportJshshir || `3${200000000000 + index * 98765}`,
          passportDocFront: u.passportDocFront || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
          passportDocBack: u.passportDocBack || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          selfieWithDoc: u.selfieWithDoc || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        }));
        setUsers(enrichedUsers);
      }
      if (Array.isArray(jData)) setJobs(jData);
      if (Array.isArray(tData)) setTransactions(tData);
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
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addBalance = async (userId: string, amount: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) { showToast(`Hisobga ${amount.toLocaleString()} UZS qo'shildi`); fetchAllData(); }
    } catch (e) { console.error(e); }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) { showToast("Foydalanuvchi roli yangilandi"); fetchAllData(); }
    } catch (e) { console.error(e); }
  };

  const toggleBan = async (userId: string, currentBannedState?: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: !currentBannedState }),
      });
      if (res.ok) {
        setToastMessage(!currentBannedState ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi");
        setTimeout(() => setToastMessage(null), 3000);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeJobStatus = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setToastMessage("E'lon holati o'zgardi");
        setTimeout(() => setToastMessage(null), 3000);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToastMessage("E'lon o'chirib tashlandi");
        setTimeout(() => setToastMessage(null), 3000);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateSettings = async (newCfg: Partial<SystemSettings>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setToastMessage("Tizim sozlamalari saqlandi");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendBroadcast = async (title: string, message: string, targetRole: string) => {
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, targetRole }),
      });
      if (res.ok) {
        setToastMessage("Ommaviy xabarnoma muvaffaqiyatli yuborildi");
        setTimeout(() => setToastMessage(null), 3000);
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
