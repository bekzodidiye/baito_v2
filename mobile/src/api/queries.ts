import { apiClient, getApiBaseUrl, setStoredToken, setStoredRefreshToken } from './client';
import { Job, Chat } from '../types';

// Jobs API
export const fetchJobs = async (): Promise<Job[]> => {
  return await apiClient('/jobs');
};

export const fetchRecommendedJobs = async (limit = 20): Promise<Job[]> => {
  return await apiClient(`/jobs/recommended?limit=${limit}`);
};

export const fetchNearbyJobs = async (lat: number, lng: number, radiusKm = 10): Promise<Job[]> => {
  return await apiClient(`/jobs/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
};

export const postJobApi = async (jobData: Partial<Job>): Promise<Job> => {
  return await apiClient('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });
};

export const deleteJobApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}`, {
    method: 'DELETE'
  });
};

export const completeJobApi = async (jobId: string, data?: { rating?: number; review?: string; bonus?: number }) => {
  return await apiClient(`/jobs/${jobId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data || {})
  });
};

export const incrementJobViewApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/view`, { method: 'POST' });
};

// Job Action API
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

// Applications API
export const fetchWorkerApplicationsApi = async () => {
  return await apiClient('/applications/worker');
};

export const fetchEmployerApplicationsApi = async () => {
  return await apiClient('/applications/employer');
};

export const updateApplicationStatusApi = async (appId: string, status: string) => {
  return await apiClient(`/applications/${appId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
};

// Chats API
export const fetchChats = async (): Promise<Chat[]> => {
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

export const sendMessageApi = async (chatId: string, text: string) => {
  return await apiClient(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
};

// Notifications API
export const fetchNotificationsApi = async () => {
  return await apiClient('/notifications');
};

export const markAllNotificationsReadApi = async () => {
  return await apiClient('/notifications/read-all', { method: 'POST' });
};

// User & Profile API
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

export const fetchActiveSessionsApi = async () => {
  return await apiClient('/users/me/sessions');
};

export const logoutSessionApi = async (sessionId: string) => {
  return await apiClient(`/users/me/sessions/${sessionId}`, { method: 'DELETE' });
};

export const logoutAllOtherSessionsApi = async () => {
  return await apiClient('/users/me/sessions', { method: 'DELETE' });
};

// Authentication API
export const loginApi = async (phone: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', phone);
  formData.append('password', password);

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
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
  const data = await response.json();
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  if (data.refresh_token) {
    setStoredRefreshToken(data.refresh_token);
  }
  return data;
};

export const logoutApi = async () => {
  setStoredToken(null);
  setStoredRefreshToken(null);
  const baseUrl = getApiBaseUrl();
  await fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
};

export const registerApi = async (data: any) => {
  return await apiClient('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const sendSmsApi = async (phone: string) => {
  return await apiClient('/auth/send-sms', {
    method: 'POST',
    body: JSON.stringify({ phone })
  });
};

export const verifySmsApi = async (phone: string, code: string) => {
  return await apiClient('/auth/verify-sms', {
    method: 'POST',
    body: JSON.stringify({ phone, code })
  });
};

// Payments API
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

export const updateJobsStorage = (_jobs?: any[]) => {};
export const updateChatsStorage = (_chats?: any[]) => {};
