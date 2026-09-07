import { auth } from './firebase.ts';

/**
 * Safely retrieves authorization headers with a valid Firebase JWT.
 * Guarantees that invalid or undefined tokens are never transmitted.
 */
export async function getAuthHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...additionalHeaders };

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      if (token && typeof token === 'string' && token !== 'undefined' && token !== 'null' && token.split('.').length === 3) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Unable to get Firebase ID token:', err);
  }

  return headers;
}

/**
 * Enhanced fetch wrapper that automatically attaches valid auth credentials if present.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const existingHeaders = (options.headers as Record<string, string>) || {};
  const authHeaders = await getAuthHeaders(existingHeaders);

  return fetch(url, {
    ...options,
    headers: authHeaders
  });
}
