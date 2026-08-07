import { useApp } from '../context/AppContext';
import { Job, Application } from '../types';
import { apiClient } from '../api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export const useEmployer = () => {
  const { language, userProfile } = useApp();
  const queryClient = useQueryClient();
  
  const companyName = userProfile?.firstName || 'Murod Buildings';

  // 1. Fetch Employer Profile (Balance)
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient('/users/me'),
    staleTime: 5 * 60 * 1000,
  });

  const balance = me?.balance || '0';

  // 2. Fetch Jobs
  const { data: postedJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: async () => {
      const jobs = await apiClient('/jobs');
      if (!jobs || !Array.isArray(jobs)) return [];
      if (!me) return jobs as Job[];
      const myJobs = jobs.filter((j: any) => 
        j.employerId === me.id || 
        j.employerId === me.uid || 
        (me.companyName && j.company === me.companyName) ||
        (me.name && j.company === me.name)
      );
      // Sort newest first, and active jobs before completed jobs
      const sorted = [...myJobs].sort((a: any, b: any) => {
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      return sorted.map((j: any) => ({
        ...j,
        durationLabel: j.durationLabel || '1 kunlik'
      })) as Job[];
    },
    refetchInterval: 30000,
  });

  // 3. Fetch Applications
  const { data: applications = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['employer-applications'],
    queryFn: async () => {
      const apps = await apiClient('/applications/employer');
      if (!apps || !Array.isArray(apps)) return [];
      return apps.map((a: any) => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        candidateName: a.workerName || 'Ishchi',
        candidatePhone: a.workerPhone || '+998 90 987 65 43',
        candidateAvatar: a.workerAvatar || null,
        candidateExperience: 'Baito tasdiqlangan foydalanuvchisi',
        status: a.status,
        appliedDate: a.appliedDate || new Date().toISOString()
      })) as Application[];
    },
    refetchInterval: 30000,
  });

  const handleSuccess = (msgUz: string, msgRu: string, msgEn: string) => {
    showToast(language === 'uz' ? msgUz : language === 'ru' ? msgRu : msgEn);
    queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const handleError = (e: any) => {
    showToast(`Xato: ${e.message}`, 'error');
  };

  // Mutations
  const postNewJobMutation = useMutation({
    mutationFn: async (newJobData: Partial<Job>) => {
      return apiClient('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: newJobData.title || '',
          company: newJobData.company || companyName,
          salary: newJobData.salary || "200000 UZS",
          location: newJobData.location || 'Toshkent',
          rawLocation: newJobData.rawLocation || newJobData.location || 'Toshkent',
          durationLabel: newJobData.durationLabel || "1 kunlik",
          description: newJobData.description || '',
          workDate: newJobData.workDate || new Date().toISOString().split('T')[0],
          workTime: newJobData.workTime || '09:00 - 18:00',
          neededWorkers: newJobData.neededWorkers || '1',
          hourlyRate: newJobData.hourlyRate || '',
          transportRate: newJobData.transportRate || '',
          category: newJobData.category || 'retail',
          responsibilities: newJobData.responsibilities || newJobData.description || '',
          requirements: newJobData.requirements || '',
          importantNote: newJobData.importantNote || '',
          tags: newJobData.tags || [],
          coordinateX: newJobData.coordinates?.x ?? 50,
          coordinateY: newJobData.coordinates?.y ?? 50,
        })
      });
    },
    onSuccess: () => {
      handleSuccess("Yangi ish e'loni muvaffaqiyatli joylashtirildi!", "Новое объявление успешно опубликовано!", "New job post published successfully!");
    },
    onError: handleError
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ appId, status }: { appId: string, status: 'hired' | 'rejected' }) => {
      const endpoint = status === 'hired' ? `/applications/${appId}/hire` : `/applications/${appId}/reject`;
      return apiClient(endpoint, { method: 'POST' });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'hired') {
        handleSuccess("Ishchi yollandi! Summa ushlab qolindi.", "Работник нанят! Сумма удержана.", "Worker hired! Amount held in escrow.");
      } else {
        handleSuccess("Ariza rad etildi.", "Заявка отклонена.", "Application rejected.");
      }
    },
    onError: handleError
  });

  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data?: { rating?: number; review?: string; bonus?: number } }) => {
      return apiClient(`/jobs/${jobId}/complete`, { 
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      });
    },
    onSuccess: () => {
      handleSuccess("Ish yakunlandi, pul ishchiga o'tkazildi!", "Работа завершена, деньги переведены!", "Job completed, money released!");
    },
    onError: handleError
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiClient(`/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      handleSuccess("E'lon o'chirildi!", "Объявление удалено!", "Job post deleted!");
    },
    onError: handleError
  });

  return {
    postedJobs,
    applications,
    balance,
    postNewJob: async (data: Partial<Job>) => { await postNewJobMutation.mutateAsync(data); return true; },
    updateApplicationStatus: async (appId: string, status: 'hired' | 'rejected') => updateApplicationMutation.mutate({ appId, status }),
    completeJob: async (jobId: string, data?: { rating?: number; review?: string; bonus?: number }) => completeJobMutation.mutate({ jobId, data }),
    deleteJob: async (jobId: string) => deleteJobMutation.mutate(jobId),
    language,
    companyName,
    employer: me,
    isLoading: isLoadingJobs || isLoadingApps
  };
};
