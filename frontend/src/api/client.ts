const API_BASE_URL = '/api/v1';

// The session lives in httpOnly cookies the browser attaches automatically —
// JavaScript never reads or stores a token.
const refreshSession = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const apiClient = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorDetail = typeof error.detail === 'string'
      ? error.detail
      : Array.isArray(error.detail)
        ? error.detail.map((e: any) => e.msg).join(', ')
        : '';

    if (!isRetry && response.status === 401) {
      if (await refreshSession()) {
        return apiClient(endpoint, options, true);
      }
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new Error(errorDetail || `So'rov bajarilmadi (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json().catch(() => ({}));
};
