export const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && !window.location.port) ||
      (window as any).Capacitor?.isNativePlatform?.())
  ) {
    return 'https://baito.tail365b27.ts.net/api/v1';
  }
  return 'https://baito.tail365b27.ts.net/api/v1';
};

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('baito_access_token');
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem('baito_access_token', token);
    } else {
      localStorage.removeItem('baito_access_token');
    }
  } catch {
    // Ignore storage errors
  }
};

export const getStoredRefreshToken = (): string | null => {
  try {
    return localStorage.getItem('baito_refresh_token');
  } catch {
    return null;
  }
};

export const setStoredRefreshToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem('baito_refresh_token', token);
    } else {
      localStorage.removeItem('baito_refresh_token');
    }
  } catch {
    // Ignore storage errors
  }
};

// Session refresh using cookie or refresh token
const refreshSession = async (): Promise<boolean> => {
  try {
    const baseUrl = getApiBaseUrl();
    const refreshToken = getStoredRefreshToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (refreshToken) {
      headers['X-Refresh-Token'] = refreshToken;
    }
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.access_token) {
        setStoredToken(data.access_token);
      }
      if (data.refresh_token) {
        setStoredRefreshToken(data.refresh_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const apiClient = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers,
  };

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorDetail = typeof error.detail === 'string' 
      ? error.detail 
      : Array.isArray(error.detail) 
        ? error.detail.map((e: any) => e.msg).join(', ')
        : '';

    if (!isRetry && response.status === 401 && !endpoint.includes('/auth/')) {
      if (await refreshSession()) {
        return apiClient(endpoint, options, true);
      }
      setStoredToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new Error(errorDetail || `So'rov bajarilmadi (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json().catch(() => ({}));
};
