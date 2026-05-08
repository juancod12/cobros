import { ApiError, type ApiErrorCode } from '@/types/api-error';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpSession = {
  accessToken?: string;
  refreshToken?: string;
};

type HttpAuthConfig = {
  getSession: () => HttpSession | null;
  onSessionUpdated: (session: { accessToken: string; refreshToken: string; expiresIn: number }) => Promise<void>;
  onSessionExpired: () => Promise<void>;
};

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
};

type SupabaseRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
  preferRepresentation?: boolean;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let authConfig: HttpAuthConfig | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureHttpAuth(config: HttpAuthConfig) {
  authConfig = config;
}

export function getHttpSession(): HttpSession | null {
  return authConfig?.getSession() ?? null;
}

function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new ApiError(
      'UNKNOWN',
      'Falta configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env.'
    );
  }
}

function buildSupabaseUrl(path: string, query?: SupabaseRequestOptions['query']) {
  ensureSupabaseConfig();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${SUPABASE_URL}/rest/v1${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function getCode(body: unknown, status?: number): ApiErrorCode {
  if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).code === 'string') {
    return (body as Record<string, ApiErrorCode>).code ?? 'UNKNOWN';
  }

  if (status === 401) {
    return 'UNAUTHORIZED';
  }

  if (status === 403) {
    return 'FORBIDDEN';
  }

  return 'UNKNOWN';
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = getCode(body, response.status);
    const message =
      (body && typeof body === 'object' && (body as Record<string, unknown>).message
        ? String((body as Record<string, unknown>).message)
        : fallbackMessage) || fallbackMessage;
    throw new ApiError(code, message, response.status, body);
  }

  return body as T;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!authConfig) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = authConfig?.getSession()?.refreshToken;

    if (!refreshToken) {
      await authConfig?.onSessionExpired();
      return null;
    }

    let response: Response;
    let usesSupabaseAuth = false;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      usesSupabaseAuth = true;
      response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }

    if (!response.ok) {
      await authConfig?.onSessionExpired();
      return null;
    }

    const data = await response.json();
    if (usesSupabaseAuth) {
      const normalized = {
        accessToken: String(data.access_token ?? ''),
        refreshToken: String(data.refresh_token ?? refreshToken),
        expiresIn: Number(data.expires_in ?? 3600),
      };
      await authConfig?.onSessionUpdated(normalized);
      return normalized.accessToken;
    }

    await authConfig?.onSessionUpdated(data);
    return data.accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}, fallbackMessage = 'No fue posible completar la operación.'): Promise<T> {
  const session = authConfig?.getSession() ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.requiresAuth !== false && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexión con el servidor.');
  }

  if (response.status === 401 && options.requiresAuth !== false && !options.skipRefresh) {
    const newAccessToken = await refreshAccessToken();

    if (!newAccessToken) {
      throw new ApiError('SESSION_EXPIRED', 'La sesión expiró. Inicia sesión nuevamente.', 401);
    }

    return httpRequest<T>(
      path,
      {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: `Bearer ${newAccessToken}`,
        },
        skipRefresh: true,
      },
      fallbackMessage
    );
  }

  return parseResponse<T>(response, fallbackMessage);
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
  fallbackMessage = 'No fue posible completar la operación con Supabase.'
): Promise<T> {
  const session = authConfig?.getSession() ?? null;
  const accessToken = options.requiresAuth === false ? null : session?.accessToken ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY ?? ''}`,
    ...(options.headers ?? {}),
  };

  if (options.preferRepresentation) {
    headers.Prefer = headers.Prefer ? `${headers.Prefer},return=representation` : 'return=representation';
  }

  let response: Response;

  try {
    response = await fetch(buildSupabaseUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexión con Supabase.');
  }

  if (response.status === 401 && options.requiresAuth !== false && !options.skipRefresh) {
    const newAccessToken = await refreshAccessToken();

    if (!newAccessToken) {
      throw new ApiError('SESSION_EXPIRED', 'La sesión expiró. Inicia sesión nuevamente.', 401);
    }

    return supabaseRequest<T>(
      path,
      {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: `Bearer ${newAccessToken}`,
        },
        skipRefresh: true,
      },
      fallbackMessage
    );
  }

  return parseResponse<T>(response, fallbackMessage);
}
