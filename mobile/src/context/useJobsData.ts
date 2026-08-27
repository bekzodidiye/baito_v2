import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, bookmarkJobApi, applyToJobApi, requestStartJobApi, confirmStartJobApi } from '../api/queries';

import { Job } from '../types';
import { useCallback } from 'react';

export function useJobsData() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetchJobs();
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 30000,
    staleTime: 1000,
  });

  const setJobs = useCallback((action: React.SetStateAction<Job[]>) => {
    queryClient.setQueryData<Job[]>(['jobs'], (old = []) => {
      const newJobs = typeof action === 'function' ? action(old) : action;
      return newJobs;
    });
  }, [queryClient]);

  const toggleBookmark = useCallback(async (jobId: string) => {
    // Optimistic UI update
    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { ...job, bookmarked: !job.bookmarked } : job
    ));
    try {
      await bookmarkJobApi(jobId);
    } catch (e) {
      console.error("Failed to toggle bookmark", e);
      // Revert optimistic update on failure
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? { ...job, bookmarked: !job.bookmarked } : job
      ));
    }
  }, [setJobs]);

  const applyToJob = useCallback(async (jobId: string) => {
    try {
      await applyToJobApi(jobId);
      
      setJobs(prevJobs => prevJobs.map(job => {
        if (job.id === jobId) {
          return { ...job, applied: true, status: 'applied' as const };
        }
        return job;
      }));
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      return true;
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || "Bir kunda ko'pi bilan 2 ta ishga ariza topshirishingiz mumkin!";
      window.dispatchEvent(new CustomEvent("global-toast", { detail: errMsg }));
      return false;
    }
  }, [setJobs, queryClient]);

  const requestStartJob = useCallback(async (jobId: string) => {
    try {
      await requestStartJobApi(jobId);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [queryClient]);

  const confirmStartJob = useCallback(async (jobId: string) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return { ...job, status: 'in_progress' as const };
      }
      return job;
    }));
    try {
      await confirmStartJobApi(jobId);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [setJobs, queryClient]);

  return { jobs, isLoading, setJobs, toggleBookmark, applyToJob, requestStartJob, confirmStartJob };
}
