// Central API client for Campusly
export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('campusly_token') || '';
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('campusly_token', token);
    } else {
      localStorage.removeItem('campusly_token');
    }
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('campusly_token');
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    const err: any = new Error(errorData.error || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = errorData;
    throw err;
  }

  return response.json();
}

