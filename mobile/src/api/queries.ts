import { apiClient, getApiBaseUrl, setStoredToken, setStoredRefreshToken } from './client';
import { Job, Chat } from '../types';

// Jobs API
export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapJobQuery {
  search?: string;
  location?: string;
  category?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  limit?: number;
  bounds?: MapBounds | null;
  clustered?: boolean;
}

export interface JobQuery {
  search?: string;
  isMap?: boolean;
  bounds?: MapBounds | null;
  enabled?: boolean;
}

export const fetchJobs = async (): Promise<Job[]> => {
  return await apiClient('/jobs');
};

export const fetchMapJobs = async (query: MapJobQuery = {}): Promise<Job[]> => {
  const params = new URLSearchParams();
  const minLat = query.bounds?.minLat ?? query.minLat;
  const maxLat = query.bounds?.maxLat ?? query.maxLat;
  const minLng = query.bounds?.minLng ?? query.minLng;
  const maxLng = query.bounds?.maxLng ?? query.maxLng;

  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.location?.trim()) params.set('location', query.location.trim());
  if (query.category?.trim()) params.set('category', query.category.trim());
  if (minLat !== undefined) params.set('min_lat', String(minLat));
  if (maxLat !== undefined) params.set('max_lat', String(maxLat));
  if (minLng !== undefined) params.set('min_lng', String(minLng));
  if (maxLng !== undefined) params.set('max_lng', String(maxLng));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.clustered !== undefined) params.set('clustered', String(query.clustered));
  const qs = params.toString();
  return await apiClient(qs ? `/jobs/map?${qs}` : '/jobs/map');
};

export const fetchChats = async () => {
  return await apiClient('/chats');
};

export const fetchChatMessages = async (chatId: string) => {
  return await apiClient(`/chats/${chatId}/messages`);
};

export const createChatApi = async (params: {
  workerId?: string;
  employerId?: string;
  jobId?: string;
}) => {
  return await apiClient('/chats', {
    method: 'POST',
    body: JSON.stringify(params)
  });
};

export const markChatReadApi = async (chatId: string) => {
  return await apiClient(`/chats/${chatId}/read`, { method: 'POST' });
};

export const sendChatMessageApi = async (
  chatId: string,
  payload: { text: string; hasMap?: boolean; mapLocation?: string },
) => {
  return await apiClient(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const deleteChatMessageApi = async (chatId: string, messageId: string) => {
  return await apiClient(`/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
  });
};

export const fetchSupportConversationApi = async () => {
  return await apiClient('/support/conversation');
};

export const sendSupportMessageApi = async (text: string) => {
  return await apiClient('/support/messages', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
};

export const deleteSupportMessageApi = async (messageId: string) => {
  return await apiClient(`/support/messages/${messageId}`, {
    method: 'DELETE',
  });
};

export type UploadPurpose = 'avatar' | 'job' | 'logo' | 'document' | 'chat';

export const uploadFileApi = async (
  file: File,
  purpose: UploadPurpose = 'document',
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  const data = await apiClient('/upload/', { method: 'POST', body: formData });
  return data.url;
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

export const completeJobApi = async (jobId: string, data?: { rating?: number; review?: string; bonus?: number }) => {
  return await apiClient(`/jobs/${jobId}/complete`, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// Applications API
export const fetchWorkerApplicationsApi = async () => {
  return await apiClient('/applications/worker');
};







// Notifications API
export const fetchNotificationsApi = async () => {
  return await apiClient('/notifications');
};

export const markAllNotificationsReadApi = async () => {
  return await apiClient('/notifications/read-all', { method: 'POST' });
};

export const markNotificationReadApi = async (notificationId: string) => {
  return await apiClient(`/notifications/${notificationId}/read`, { method: 'POST' });
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


