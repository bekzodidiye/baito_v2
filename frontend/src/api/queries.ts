import { apiClient } from './client';
import { Job } from '../types';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface JobQuery {
  /** Free text. Matched server-side against title, company, description and
   *  location, so a posting past the first page is still reachable. */
  search?: string;
  isMap?: boolean;
  bounds?: MapBounds | null;
  enabled?: boolean;
}

export const fetchJobs = async (query: JobQuery = {}): Promise<Job[]> => {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  const qs = params.toString();
  return await apiClient(qs ? `/jobs/?${qs}` : '/jobs/');
};

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

export interface LocationCounts {
  total: number;
  regions: Record<string, number>;
  districts: Record<string, number>;
}

export const fetchLocationCounts = async (): Promise<LocationCounts> => {
  return await apiClient('/jobs/location-counts');
};

export const fetchJobById = async (jobId: string): Promise<Job> => {
  return await apiClient(`/jobs/${jobId}`);
};

export const fetchChats = async () => {
  return await apiClient('/chats/');
};

export const fetchChatMessages = async (chatId: string) => {
  return await apiClient(`/chats/${chatId}/messages`);
};

/** Open a conversation. Name only the *other* participant: the server fills
    in the caller's side from the session, so a worker passes `employerId` and
    an employer passes `workerId`. The old signature took a bare `employerId`,
    which meant an employer opening a chat with a candidate named the wrong
    side of it. */
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

/** Send the daily digest now. The button for this used to set a flag and
    claim success 1.2 seconds later without sending anything. */
export const sendDigestNowApi = async () => {
  return await apiClient('/admin/reports/digest', { method: 'POST' });
};

/** One support ticket with its conversation. The list endpoint returns no
    messages, and passing a list row to the chat view crashed it. */
export const fetchAdminTicketApi = async (ticketId: string) => {
  return await apiClient(`/admin/support-tickets/${ticketId}`);
};

export const replyToTicketApi = async (
  ticketId: string,
  payload: { text: string; status?: string },
) => {
  return await apiClient(`/admin/support-tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateTicketStatusApi = async (ticketId: string, status: string) => {
  return await apiClient(`/admin/support-tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

/** The user's own support conversation. The admin panel could read and reply
    to tickets, but nothing let a user open one, so the queue could never fill. */
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


/** Mark everything the other participant sent as read. Deliberately its own
    call rather than a side effect of fetching the messages. */
export const markChatReadApi = async (chatId: string) => {
  return await apiClient(`/chats/${chatId}/read`, { method: 'POST' });
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

export const deleteChatMessageApi = async (chatId: string, messageId: string) => {
  return await apiClient(`/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
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
  return await apiClient('/notifications/');
};

export const fetchWorkerApplicationsApi = async () => {
  return await apiClient('/applications/worker');
};

export const withdrawApplicationApi = async (appId: string) => {
  return await apiClient(`/applications/${appId}/withdraw`, {
    method: 'POST',
  });
};

export const createDisputeApi = async (jobId: string, reason: string) => {
  return await apiClient(`/jobs/${jobId}/dispute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export type UploadPurpose = 'avatar' | 'job' | 'logo' | 'document' | 'chat';

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

export const markNotificationReadApi = async (notificationId: string) => {
  return await apiClient(`/notifications/${notificationId}/read`, { method: 'POST' });
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


/** The invoice a company opens from the button in its billing email.
 *
 *  Public on purpose — the person who pays a company's bills usually has no
 *  account here, and the token in the URL is the credential. apiClient only
 *  attempts a session refresh on 401, so an anonymous caller passes straight
 *  through.
 */
export const fetchInvoiceApi = async (token: string) => {
  return await apiClient(`/invoices/${encodeURIComponent(token)}`);
};

export const declareInvoicePaymentApi = async (
  token: string,
  data: { method: string; reference?: string },
) => {
  return await apiClient(`/invoices/${encodeURIComponent(token)}/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** The days a posting covers, each with its own status and its own wage.
 *
 *  A three-day shift is three of these. Finishing one pays for one — which is
 *  the whole reason they exist as separate records.
 */
export const fetchJobDaysApi = async (jobId: string) => {
  return await apiClient(`/jobs/${jobId}/days`);
};

export const completeJobDayApi = async (jobId: string, dayId: string) => {
  return await apiClient(`/jobs/${jobId}/days/${dayId}/complete`, { method: 'POST' });
};

export const completeJobApi = async (
  jobId: string,
  data: { rating?: number; review?: string; bonus?: number } = {},
) => {
  return await apiClient(`/jobs/${jobId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};


