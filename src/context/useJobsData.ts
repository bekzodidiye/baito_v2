import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, updateJobsStorage } from '../api/queries';
import { initialJobs } from '../mockData';
import { Job } from '../types';
import { useCallback } from 'react';

export function useJobsData() {
  const queryClient = useQueryClient();

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const serverJobs = await fetchJobs();
      
      // FIX: Bookmark Reset Bug during polling
      // When the server sends a fresh list of jobs, it might overwrite optimistic local updates (like bookmarks or applies).
      // We merge the incoming server jobs with our locally cached state to preserve bookmarks.
      const currentLocalJobs = queryClient.getQueryData<Job[]>(['jobs']) || [];
      const localJobMap = new Map(currentLocalJobs.map(job => [job.id, job]));
      
      return serverJobs.map(serverJob => {
        const localJob = localJobMap.get(serverJob.id);
        if (localJob) {
          // Preserve local interaction state that might not be synced to the backend yet
          return {
            ...serverJob,
            bookmarked: localJob.bookmarked,
            applied: localJob.applied,
            status: localJob.status
          };
        }
        return serverJob;
      });
    },
    initialData: () => {
      try {
        const saved = localStorage.getItem('baito_jobs');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return initialJobs;
    },
    /*
      TODO (Backend / Architecture): 
      Investigate WebSocket or Server-Sent Events (SSE) for real-time map updates.
      Polling (e.g. refetchInterval: 30000) causes full list re-renders and wastes mobile data/battery.
      For a map-based app (like Uber/Yandex), the backend should push events for new/removed jobs within the active viewport via WS/SSE.
    */
    refetchInterval: 30000, 
  });

  const jobsMutation = useMutation({
    mutationFn: async (newJobs: Job[]) => {
      updateJobsStorage(newJobs);
      return newJobs;
    },
    onSuccess: (newJobs) => {
      queryClient.setQueryData(['jobs'], newJobs);
    },
  });

  const setJobs = useCallback((action: React.SetStateAction<Job[]>) => {
    queryClient.setQueryData<Job[]>(['jobs'], (old = []) => {
      const newJobs = typeof action === 'function' ? action(old) : action;
      updateJobsStorage(newJobs);
      return newJobs;
    });
  }, [queryClient]);

  const toggleBookmark = useCallback((jobId: string) => {
    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { ...job, bookmarked: !job.bookmarked } : job
    ));
  }, [setJobs]);

  const applyToJob = useCallback((jobId: string) => {
    let success = false;
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        success = true;
        return { ...job, applied: true, status: 'applied' as const };
      }
      return job;
    }));
    return success;
  }, [setJobs]);

  return { jobs, setJobs, toggleBookmark, applyToJob };
}
