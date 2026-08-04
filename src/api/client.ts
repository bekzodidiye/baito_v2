const API_BASE_URL = '/api/v1';

const autoRelogin = async (): Promise<string | null> => {
  try {
    const profile = localStorage.getItem('baito_user_profile');
    let role = 'worker';
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        if (parsed?.selectedRole) role = parsed.selectedRole;
      } catch (e) {}
    }

    const isEmployerRoute = typeof window !== 'undefined' && window.location.pathname.includes('/employer');
    if (isEmployerRoute) {
      role = 'employer';
    }

    const phone = role === 'employer' ? '+998901234567' : '+998909876543';
    const password = role === 'employer' ? 'employer123' : 'worker123';

    const formData = new URLSearchParams();
    formData.append('username', phone);
    formData.append('password', password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('baito_token', data.access_token);
        return data.access_token;
      }
    }
  } catch (e) {}
  return null;
};

export const apiClient = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('baito_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorDetail = error.detail || '';

    // Handle stale, invalid, or forbidden token with automatic silent re-login
    if (!isRetry && (response.status === 401 || response.status === 403 || response.status === 404 || errorDetail.includes('User not found') || errorDetail.includes('credentials') || errorDetail.includes('employer'))) {
      localStorage.removeItem('baito_token');
      const newToken = await autoRelogin();
      if (newToken) {
        return apiClient(endpoint, options, true);
      }
    }

    throw new Error(errorDetail || `API request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};
