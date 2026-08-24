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
  // workerId is derived from the session server-side.
  return await apiClient('/chats', {
    method: 'POST',
    body: JSON.stringify({ employerId, jobId })
  });
};

export const sendChatMessageApi = async (
  chatId: string,
  payload: { text: string; hasMap?: boolean; mapLocation?: string },
) => {
  // HTTP fallback for when the WebSocket cannot connect.
  return await apiClient(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
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

export type UploadPurpose = 'avatar' | 'job' | 'logo' | 'document';

export const uploadFileApi = async (
  file: File,
  purpose: UploadPurpose = 'document',
): Promise<string> => {
  // Auth is the httpOnly session cookie. The previous version read an
  // 'access_token' key from localStorage that nothing ever writes and omitted
  // credentials entirely, so every upload came back 401.
  const formData = new FormData();
  formData.append('file', file);
  // Decides who may read the file back: identity documents stay private.
  formData.append('purpose', purpose);

  const data = await apiClient('/upload/', { method: 'POST', body: formData });
  return data.url;
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
export const updateJobsStorage = (_jobs?: any[]) => { };
export const updateChatsStorage = (_chats?: any[]) => { };

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
  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => { });
};

export const registerApi = async (data: any) => {
  return await apiClient('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const verifySmsApi = async (phone: string, code: string) => {
  // Returns a single-use verification_token that registerApi must pass along.
  return await apiClient('/auth/verify-sms', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
};

export const requestWithdrawalApi = async (amount: number) => {
  return await apiClient('/payments/withdraw', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ amount }),
  });
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
