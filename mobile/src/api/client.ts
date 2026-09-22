import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { serverClock } from '@/lib/serverClock';

/**
 * API base URL. EXPO_PUBLIC_API_URL wins; otherwise in development we reuse the host
 * that serves the JS bundle, so a phone on the same Wi-Fi reaches the laptop's API
 * without any configuration.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost') return `http://${host}:4000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

export const API_URL = `${resolveBaseUrl()}/api/v1`;

/** Error with the backend's stable machine-readable code (SOLD_OUT, REGISTRATION_CLOSED...). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => {
  authToken = token;
};
export const getAuthToken = () => authToken;

/** Called when the server rejects our token (expired, or the account is gone). */
let unauthorizedHandler: (() => void) | null = null;
export const onUnauthorized = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal };

export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authToken) unauthorizedHandler?.();
    throw new ApiError(res.status, data?.error?.code ?? 'HTTP_ERROR', data?.error?.message ?? res.statusText);
  }
  // Any response with a timeline lets us keep the countdown aligned with server time.
  serverClock.sync(data?.timeline?.serverTime, startedAt);
  return data as T;
}
