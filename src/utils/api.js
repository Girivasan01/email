export const API_BASE_URL = 'https://coral-chinchilla-989361.hostingersite.com/api';
export const ASSET_BASE_URL = 'https://coral-chinchilla-989361.hostingersite.com';

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
