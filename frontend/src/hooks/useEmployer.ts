import { Job, Application } from '../types';
import { apiClient } from '../api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../utils/toast';
import { useAuthStore } from "../store/useAuthStore";
import { translations } from '../translations';

export const useEmployer = () => {
  const language = useAuthStore(s => s.language);
  const t = translations[language];
    const userProfile = useAuthStore(s => s.userProfile);
  const queryClient = useQueryClient();
  
  // 1. Fetch Employer Profile (Balance)
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient('/users/me'),
    staleTime: 5 * 60 * 1000,
  });

  const companyName = me?.companyName || me?.name || userProfile?.firstName || t.roleEmployer;
  const balance = me?.totalSpent || me?.balance || '0';

  // 2. Fetch Jobs (Strictly authenticated employer's own jobs)
  const { data: postedJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['employer-jobs', me?.id || me?.uid],
    enabled: !!(me?.id || me?.uid),
    queryFn: async () => {
      const jobs = await apiClient('/jobs/my');
      if (!jobs || !Array.isArray(jobs)) return [];
      
      // Sort newest first, and active jobs before completed jobs
      const sorted = [...jobs].sort((a: any, b: any) => {
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
    refetchInterval: 15000,
  });

  // 3. Fetch Applications
  const { data: applications = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['employer-applications', me?.id || me?.uid],
    enabled: !!(me?.id || me?.uid),
    queryFn: async () => {
      const apps = await apiClient('/applications/employer');
      if (!apps || !Array.isArray(apps)) return [];
      return apps.map((a: any) => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        wageAmount: a.wageAmount ?? 0,
        candidateName: a.workerName || t.roleWorker,
        // A worker with no number on file used to be given a made-up one, which
        // an employer could read as theirs and dial.
        candidatePhone: a.workerPhone || '',
        candidateAvatar: a.workerAvatar || null,
        candidateExperience: a.workerBio || t.verifiedUser,
        workerRating: a.workerRating,
        workerCompletedJobs: a.workerCompletedJobs,
        workerBirthDate: a.workerBirthDate,
        workerGender: a.workerGender,
        workerSkills: a.workerSkills,
        status: a.status,
        rating: a.rating,
        review: a.review,
        bonus: a.bonus,
        appliedDate: a.appliedDate || new Date().toISOString()
      })) as Application[];
    },
    refetchInterval: 15000,
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
  //
  // A blank field is sent blank. This used to substitute a wage of
  // "200000 UZS", a location of Toshkent, today's date and a 09:00-18:00
  // shift for anything the employer left empty - figures nobody chose, on a
  // posting that then went live carrying them, and the wage is what the
  // freezes and what the worker is paid. JobPostForm is the only caller
  // (`postNewJob` is this hook's sole export of the mutation) and it refuses
  // to advance past step 2 without a date, a time, a worker count and a
  // positive wage, so none of those substitutions was ever reachable. What
  // reaches the API now is what was typed; a blank title, wage, location or
  // description comes back as a 422 the employer can read, instead of being
  // quietly filled in.
  const postNewJobMutation = useMutation({
    mutationFn: async (newJobData: Partial<Job>) => {
      return apiClient('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: (newJobData.title || '').trim(),
          // Not an invented figure: the server reads this as "no company
          // given" and fills in the account's own name.
          company: (newJobData.company || companyName || t.roleEmployer).trim(),
          salary: newJobData.salary,
          location: newJobData.location,
          rawLocation: newJobData.rawLocation || newJobData.location,
          durationLabel: newJobData.durationLabel,
          description: (newJobData.description || newJobData.responsibilities || '').trim(),
          workDate: newJobData.workDate,
          workTime: newJobData.workTime,
          neededWorkers: newJobData.neededWorkers || '1',
          hourlyRate: newJobData.hourlyRate || '',
          transportRate: newJobData.transportRate || '',
          category: newJobData.category || 'retail',
          imageUrl: newJobData.imageUrl || undefined,
          logoUrl: newJobData.logoUrl || newJobData.imageUrl || undefined,
          responsibilities: newJobData.responsibilities || newJobData.description || '',
          requirements: newJobData.requirements || '',
          importantNote: newJobData.importantNote || '',
          tags: newJobData.tags || [],
          coordinateX: (newJobData.coordinates?.x && newJobData.coordinates.x !== 50) ? newJobData.coordinates.x : 41.3111,
          coordinateY: (newJobData.coordinates?.y && newJobData.coordinates.y !== 50) ? newJobData.coordinates.y : 69.2406,
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
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
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      if (variables.status === 'hired') {
        handleSuccess("Ishchi yollandi!", "Работник нанят!", "Worker hired!");
      } else {
        handleSuccess("Ariza rad etildi.", "Заявка отклонена.", "Application rejected.");
      }
    },
    onError: handleError
  });

  const confirmStartJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiClient(`/jobs/${jobId}/confirm-start`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      handleSuccess("Ish boshlanishi tasdiqlandi!", "Начало работы подтверждено!", "Job start confirmed!");
    },
    onError: handleError
  });

  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data?: { rating?: number; review?: string; bonus?: number } }) => {
      try {
        return await apiClient(`/jobs/${jobId}/complete`, { 
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined
        });
      } catch (err: any) {
        // If already completed by worker, and review data was provided, call review endpoint
        if (data?.rating && (err?.message?.includes('allaqachon yakunlangan') || err?.status === 400)) {
          return await apiClient(`/jobs/${jobId}/review`, {
            method: 'POST',
            body: JSON.stringify({
              rating: data.rating,
              review: data.review || "Ish bajarildi",
              bonus: data.bonus || 0,
            }),
          });
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      handleSuccess("Ish yakunlandi, pul ishchiga o'tkazildi!", "Работа завершена, деньги переведены!", "Job completed, money released!");
    },
    onError: handleError
  });

  const reviewJobMutation = useMutation({
    mutationFn: async ({ jobId, data }: { jobId: string; data: { rating: number; review: string; bonus?: number; applicationId?: string } }) => {
      return apiClient(`/jobs/${jobId}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      handleSuccess("Sharhingiz qabul qilindi!", "Ваш отзыв принят!", "Your review has been submitted!");
    },
    onError: handleError,
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiClient(`/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
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
    confirmStartJob: async (jobId: string) => confirmStartJobMutation.mutate(jobId),
    completeJob: async (jobId: string, data?: { rating?: number; review?: string; bonus?: number }) => completeJobMutation.mutate({ jobId, data }),
    reviewJob: async (jobId: string, data: { rating: number; review: string; bonus?: number; applicationId?: string }) => reviewJobMutation.mutateAsync({ jobId, data }),
    deleteJob: async (jobId: string) => deleteJobMutation.mutate(jobId),
    language,
    companyName,
    employer: me,
    isLoading: isLoadingJobs || isLoadingApps
  };
};
