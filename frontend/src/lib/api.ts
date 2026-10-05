/**
 * Client for our own backend: authentication and the per-user timetable selections.
 *
 * Timetable data does not come through here — it comes from the Wise catalogue and schedule in
 * `@/lib/wiseApi`, which the backend proxies.
 */

import type {WiseSelection} from './wiseApi';

/**
 * Empty means "same origin": the page and the API are served from one host, nginx proxies
 * /auth, /user and /api to the backend, and the browser makes no cross-origin request at all.
 * `??` rather than `||` matters here — an empty string is the deliberate production value, and
 * `||` would treat it as unset and fall back to localhost.
 */
const API_HOST = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5013';

async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_HOST}${path}`, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      ((data as Record<string, unknown>).message as string) ||
        `Request failed: ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function authHeaders(token: string, json = false): HeadersInit {
  return json
    ? {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}
    : {Authorization: `Bearer ${token}`};
}

// ── Authentication ──────────────────────────────────────────────────────────

export function loginWithEmail(
  email: string,
  password: string,
): Promise<{token: string}> {
  return apiClient('/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });
}

export function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<{token: string}> {
  return apiClient('/auth/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, email, password}),
  });
}

// ── Timetable selections ────────────────────────────────────────────────────

/**
 * Persisted shape of a signed-in student's timetable. The version tag matters: the same column
 * previously held the per-class group filter of the old BV20-only timetable, and a reader that
 * does not check `v` would hand that back as a list of selections.
 */
export type StoredSelections = {v: 2; selections: WiseSelection[]};

export function getStoredSelections(
  token: string,
): Promise<{groupFilters?: string}> {
  return apiClient('/user/filters', {headers: authHeaders(token)});
}

export function saveStoredSelections(
  token: string,
  selections: WiseSelection[],
): Promise<void> {
  const payload: StoredSelections = {v: 2, selections};
  return apiClient('/user/filters', {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({groupFilters: JSON.stringify(payload)}),
  });
}
