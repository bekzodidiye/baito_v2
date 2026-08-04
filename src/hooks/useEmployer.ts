import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Job, Application } from '../types';

export const useEmployer = () => {
  const { language, setToastMessage, userProfile } = useApp();
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [balance, setBalance] = useState('0');
  
  const companyName = userProfile?.firstName || 'Murod Buildings';

  const fetchData = useCallback(async () => {
    try {
      const headers = { 'x-user-role': 'employer' };
      
      const meRes = await fetch('/api/me', { headers });
      if (meRes.ok) {
        const me = await meRes.json();
        setBalance(me.balance || '0');
      }

      const jobsRes = await fetch('/api/employer/jobs', { headers });
      if (jobsRes.ok) {
        const jobs = await jobsRes.json();
        setPostedJobs(jobs.map((j: any) => ({
          ...j,
          durationLabel: j.durationLabel || '1 kun'
        })));
      }
      
      const appsRes = await fetch('/api/employer/applications', { headers });
      if (appsRes.ok) {
        const apps = await appsRes.json();
        const mappedApps = apps.map((a: any) => ({
          id: a.id,
          jobId: a.jobId,
          jobTitle: a.jobTitle,
          candidateName: a.workerName,
          candidatePhone: a.status === 'hired' ? a.workerPhone : '***-**-** (Yashirin)',
          candidateAvatar: a.workerAvatar,
          candidateExperience: 'Baito tasdiqlangan foydalanuvchisi',
          status: a.status,
          appliedDate: a.appliedDate
        }));
        setApplications(mappedApps);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add a new job
  const postNewJob = async (newJobData: Partial<Job>) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'employer' },
        body: JSON.stringify({
          title: newJobData.title || '',
          company: companyName,
          salary: newJobData.salary || "200000",
          location: newJobData.location || 'Toshkent',
          durationLabel: newJobData.durationLabel || "1 kun",
          description: newJobData.description || ''
        })
      });
      if (res.ok) {
        setToastMessage(language === 'uz' ? "Yangi ish e'loni muvaffaqiyatli joylashtirildi!" : language === 'ru' ? "Новое объявление успешно опубликовано!" : "New job post published successfully!");
        setTimeout(() => setToastMessage(null), 3000);
        fetchData();
        return true;
      } else {
        const err = await res.json();
        setToastMessage("Xato: " + err.error);
        setTimeout(() => setToastMessage(null), 3000);
        return false;
      }
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  // Approve or reject application (Hire holds money)
  const updateApplicationStatus = async (appId: string, status: 'hired' | 'rejected') => {
    try {
      const endpoint = status === 'hired' ? `/api/applications/${appId}/hire` : `/api/applications/${appId}/reject`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-user-role': 'employer' }
      });
      if (res.ok) {
        if (status === 'hired') {
          setToastMessage(language === 'uz' ? "Ishchi yollandi! Summa ushlab qolindi." : language === 'ru' ? "Работник нанят! Сумма удержана." : "Worker hired! Amount held in escrow.");
        } else {
          setToastMessage(language === 'uz' ? "Ariza rad etildi." : language === 'ru' ? "Заявка отклонена." : "Application rejected.");
        }
        fetchData();
      } else {
        const err = await res.json();
        setToastMessage("Xato: " + err.error);
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Complete job
  const completeJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'x-user-role': 'employer' }
      });
      if (res.ok) {
        setToastMessage(language === 'uz' ? "Ish yakunlandi, pul ishchiga o'tkazildi!" : language === 'ru' ? "Работа завершена, деньги переведены!" : "Job completed, money released!");
        fetchData();
      } else {
        const err = await res.json();
        setToastMessage("Xato: " + err.error);
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'employer' }
      });
      if (res.ok) {
        setToastMessage(language === 'uz' ? "E'lon o'chirildi!" : language === 'ru' ? "Объявление удалено!" : "Job post deleted!");
        fetchData();
      } else {
        const err = await res.json();
        setToastMessage("Xato: " + err.error);
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return {
    postedJobs,
    applications,
    balance,
    postNewJob,
    updateApplicationStatus,
    completeJob,
    deleteJob,
    language,
    companyName
  };
};
