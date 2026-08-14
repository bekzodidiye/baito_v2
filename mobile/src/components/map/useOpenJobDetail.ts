import { useEffect } from 'react';
import { Job } from '../../types';

export function useOpenJobDetail(jobs: Job[], setSelectedJob: (job: Job | null) => void) {
  useEffect(() => {
    const handleOpenJobDetail = (e: Event) => {
      const customEvent = e as CustomEvent;
      const jobId = customEvent.detail;
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
      }
    };
    
    window.addEventListener('open-job-detail', handleOpenJobDetail);
    
    return () => {
      window.removeEventListener('open-job-detail', handleOpenJobDetail);
    };
  }, [jobs, setSelectedJob]);
}
