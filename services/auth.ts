import { ApiError, type ApiErrorCode } from '@/types/api-error';
import type { Permission, Role } from '@/types/rbac';

export type LoginPayload = {
  email: string;
  password: string;
  fullName?: string;
  citizenId?: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserResponse;
};

export type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  status: 'active' | 'inactive';
  permissions?: Permission[];
};

export type AuthApiErrorCode = ApiErrorCode;

export { ApiError as AuthApiError } from '@/types/api-error';

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

type SupabaseTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUserResponse;
};

type AppUserRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
};

type UserRoleRow = {
  role?: {
    code?: string;
  } | null;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_AUTH_BASE = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : null;

function ensureSupabaseConfig() {
  if (!SUPABASE_AUTH_BASE || !SUPABASE_ANON_KEY) {
    throw new ApiError(
      'UNKNOWN',
      'Falta configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env.'
    );
  }
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseStatus(value: unknown): 'active' | 'inactive' {
  const normalized = getString(value)?.toLowerCase();
  if (normalized === 'inactive' || normalized === 'suspended') {
    return 'inactive';
  }
  return 'active';
}

function mapSupabaseUserToAuthUser(
  user: SupabaseUserResponse,
  profile: Partial<AuthUserResponse> = {}
): AuthUserResponse {
  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const defaultName = getString(user.email)?.split('@')[0] ?? 'Usuario';

  return {
    id: profile.id ?? user.id,
    email: profile.email ?? getString(user.email) ?? '',
    name:
      profile.name ??
      getString(userMetadata.full_name) ??
      getString(userMetadata.name) ??
      getString(appMetadata.full_name) ??
      defaultName,
    role: profile.role ?? getString(userMetadata.role) ?? getString(appMetadata.role) ?? 'COLLECTOR',
    status: profile.status ?? parseStatus(userMetadata.status ?? appMetadata.status),
    permissions: profile.permissions,
  };
}

function getErrorMessage(body: Record<string, unknown>, fallbackMessage: string) {
  return getString(body.msg) ?? getString(body.message) ?? fallbackMessage;
}

async function requestSupabaseToken(
  grantType: 'password' | 'refresh_token',
  payload: Record<string, unknown>,
  errorCode: AuthApiErrorCode,
  fallbackMessage: string
): Promise<SupabaseTokenResponse> {
  ensureSupabaseConfig();
  const anonKey = SUPABASE_ANON_KEY as string;

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_AUTH_BASE}/token?grant_type=${grantType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexion con Supabase Auth.');
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(errorCode, getErrorMessage(body, fallbackMessage), response.status, body);
  }

  return body as unknown as SupabaseTokenResponse;
}

async function fetchAppUserProfile(accessToken: string, authUserId: string): Promise<Partial<AuthUserResponse>> {
  const supabaseUrl = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return {};
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const usersResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?select=id,full_name,email,status&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
      { headers }
    );
    if (!usersResponse.ok) {
      return {};
    }

    const users = (await usersResponse.json()) as AppUserRow[];
    const appUser = users[0];
    if (!appUser) {
      return {};
    }

    let roleCode: string | undefined;
    const rolesResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?select=role:roles(code)&user_id=eq.${encodeURIComponent(appUser.id)}&limit=1`,
      { headers }
    );
    if (rolesResponse.ok) {
      const roleRows = (await rolesResponse.json()) as UserRoleRow[];
      roleCode = getString(roleRows[0]?.role?.code);
    }

    return {
      id: appUser.id,
      email: appUser.email,
      name: appUser.full_name,
      role: roleCode,
      status: parseStatus(appUser.status),
    };
  } catch {
    return {};
  }
}

async function mapTokenToSessionResponse(tokenResponse: SupabaseTokenResponse): Promise<AuthSessionResponse> {
  const profile = await fetchAppUserProfile(tokenResponse.access_token, tokenResponse.user.id);
  const user = mapSupabaseUserToAuthUser(tokenResponse.user, profile);

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    user,
  };
}

export async function login(payload: LoginPayload): Promise<AuthSessionResponse> {
  const tokenResponse = await requestSupabaseToken(
    'password',
    { email: payload.email, password: payload.password },
    'INVALID_CREDENTIALS',
    'Credenciales invalidas.'
  );

  return mapTokenToSessionResponse(tokenResponse);
}

export async function refresh(refreshToken: string): Promise<AuthSessionResponse> {
  const tokenResponse = await requestSupabaseToken(
    'refresh_token',
    { refresh_token: refreshToken },
    'SESSION_EXPIRED',
    'No fue posible renovar la sesion.'
  );

  return mapTokenToSessionResponse(tokenResponse);
}

export async function adminResetPassword(_userId: string): Promise<{ message: string }> {
  throw new ApiError(
    'UNKNOWN',
    'El reseteo administrativo no esta disponible sin un backend seguro. Usa recuperacion por correo en Supabase.'
  );
}

export async function getCurrentUser(accessToken: string): Promise<AuthUserResponse> {
  ensureSupabaseConfig();
  const anonKey = SUPABASE_ANON_KEY as string;

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_AUTH_BASE}/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexion con Supabase Auth.');
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError('UNAUTHORIZED', getErrorMessage(body, 'Sesion invalida.'), response.status, body);
  }

  const supabaseUser = body as unknown as SupabaseUserResponse;
  const profile = await fetchAppUserProfile(accessToken, supabaseUser.id);
  return mapSupabaseUserToAuthUser(supabaseUser, profile);
}
