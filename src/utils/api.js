const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const isLocalHost = typeof window !== 'undefined' && LOCAL_HOSTS.has(window.location.hostname);

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (isLocalHost ? '/api' : 'https://coral-chinchilla-989361.hostingersite.com/api');
export const ASSET_BASE_URL =
  import.meta.env.VITE_ASSET_BASE_URL || (isLocalHost ? 'http://localhost:3000' : 'https://coral-chinchilla-989361.hostingersite.com');

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message ? payload.message : 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

export function assetUrl(path) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${ASSET_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
