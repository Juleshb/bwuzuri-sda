const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api(path: string, init: RequestInit = {}) {
  if (!navigator.onLine) {
    throw new ApiError(0, 'Mobile client is online-only. Connect to the internet to continue.');
  }
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Bwuzuri-Client', 'mobile');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(base + path, {...init, headers});
  } catch {
    throw new ApiError(0, 'Mobile client is online-only. The central API is unreachable.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('bwuzuri:session-expired'));
    }
    throw new ApiError(response.status, payload.message || 'Request failed');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
