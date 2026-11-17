import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, fetchMapJobs, JobQuery, bookmarkJobApi, applyToJobApi, requestStartJobApi, confirmStartJobApi } from '../api/queries';

import { Job } from '../types';
import { useCallback } from 'react';

export function useJobsData(query: JobQuery = {}) {
  const queryClient = useQueryClient();

  const isMap = query.isMap ?? false;
  const search = query.search?.trim() ?? '';
  const queryKey = isMap ? ['jobs', 'map'] : search ? ['jobs', { search }] : ['jobs'];

  const { data: jobs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isMap) {
        const res = await fetchMapJobs();
        return Array.isArray(res) ? res : [];
      }
      const res = await fetchJobs({ search });
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: isMap ? 30000 : 10000,
    staleTime: isMap ? 15000 : 5000,
    refetchOnWindowFocus: true,
    // Keep the previous results on screen while the next search loads, so the
    // list does not blank out on every keystroke.
    placeholderData: (previous) => previous,
  });

  const setJobs = useCallback((action: React.SetStateAction<Job[]>) => {
    // Write to whichever entry this caller is reading, not always the unfiltered
    // one — otherwise an optimistic update on a search result went nowhere.
    queryClient.setQueryData<Job[]>(queryKey, (old = []) => {
      const newJobs = typeof action === 'function' ? action(old) : action;
      return newJobs;
    });
  }, [queryClient, search]);

  const toggleBookmark = useCallback(async (jobId: string) => {
    // Optimistic UI update
    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { ...job, bookmarked: !job.bookmarked } : job
    ));
    try {
      await bookmarkJobApi(jobId);
      // Other screens hold their own copy of the same job.
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (e) {
      console.error("Failed to toggle bookmark", e);
      // Revert optimistic update on failure
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? { ...job, bookmarked: !job.bookmarked } : job
      ));
    }
  }, [setJobs, queryClient]);

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
