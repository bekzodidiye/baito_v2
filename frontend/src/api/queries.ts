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

export const fetchWorkerApplicationsApi = async () => {
  return await apiClient('/applications/worker');
};

export const fetchUserProfileApi = async () => {
  return await apiClient('/users/me');
};

export const updateUserProfileApi = async (data: any) => {
  return await apiClient('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const changePasswordApi = async (data: { current_password: string; new_password: string }) => {
  return await apiClient('/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const markAllNotificationsReadApi = async () => {
  return await apiClient('/notifications/read-all', { method: 'POST' });
};

export const fetchActiveSessionsApi = async () => {
  return await apiClient('/users/me/sessions');
};

export const logoutSessionApi = async (sessionId: string) => {
  return await apiClient(`/users/me/sessions/${sessionId}`, { method: 'DELETE' });
};

export const logoutAllOtherSessionsApi = async () => {
  return await apiClient('/users/me/sessions', { method: 'DELETE' });
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
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Telefon raqam yoki parol xato');
  }
  return response.json();
};

export const logoutApi = async () => {
  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
};

export const registerApi = async (data: any) => {
  return await apiClient('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const requestWithdrawalApi = async (amount: number) => {
  return await apiClient('/payments/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
};

export const fetchPaymentCardsApi = async () => {
  return await apiClient('/payments/cards');
};

export const addPaymentCardApi = async (data: { type: string, last4: string, bank: string }) => {
  return await apiClient('/payments/cards', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const deletePaymentCardApi = async (cardId: string) => {
  return await apiClient(`/payments/cards/${cardId}`, {
    method: 'DELETE'
  });
};

export const updatePaymentCardApi = async (cardId: string, data: any) => {
  return await apiClient(`/payments/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const fetchTransactionsApi = async () => {
  return await apiClient('/payments/transactions');
};

export const incrementJobViewApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/view`, { method: 'POST' });
};
