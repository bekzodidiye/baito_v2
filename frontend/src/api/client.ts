const API_BASE_URL = '/api/v1';

// The session lives in httpOnly cookies the browser attaches automatically —
// JavaScript never reads or stores a token.
let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = async (): Promise<boolean> => {
  // Several requests failing at once used to fire several refreshes, each
  // rotating the cookie out from under the others.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Allow the next genuine 401 to try again.
        setTimeout(() => { refreshInFlight = null; }, 0);
      }
    })();
  }
  return refreshInFlight;
};

export const apiClient = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      // Setting Content-Type on a FormData body strips the multipart boundary
      // and the request becomes unparseable.
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

/** Some admin list endpoints return `{ total, items }`; older ones a bare array. */
export const unwrapList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [];
};
