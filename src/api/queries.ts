import { apiClient } from './client';
import { Job, Chat } from '../types';

export const fetchJobs = async (): Promise<Job[]> => {
  return await apiClient('/jobs');
};

export const fetchChats = async () => {
  return await apiClient('/chats');
};

export const fetchChatMessages = async (chatId: string) => {
  return await apiClient(`/chats/${chatId}/messages`);
};

export const createChatApi = async (employerId: string, jobId?: string) => {
  return await apiClient('/chats', {
    method: 'POST',
    body: JSON.stringify({ employerId, jobId })
  });
};

export const bookmarkJobApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/bookmark`, { method: 'POST' });
};

export const applyToJobApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/apply`, { method: 'POST' });
};

export const requestStartJobApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/request-start`, { method: 'POST' });
};

export const confirmStartJobApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/confirm-start`, { method: 'POST' });
};

export const fetchNotificationsApi = async () => {
  return await apiClient('/notifications');
};

export const markAllNotificationsReadApi = async () => {
  return await apiClient('/notifications/read-all', { method: 'POST' });
};

// Storage updates are deprecated since we use real backend
export const updateJobsStorage = (_jobs?: any[]) => {};
export const updateChatsStorage = (_chats?: any[]) => {};

export const loginApi = async (phone: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', phone);
  formData.append('password', password);

  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }
  return response.json();
};

export const registerApi = async (data: any) => {
  return await apiClient('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
