import { useSyncExternalStore } from 'react';

import { configureHttpAuth } from '@/services/http';
import {
  AuthApiError,
  type AuthApiErrorCode,
  getCurrentUser,
  login as loginRequest,
  refresh as refreshRequest,
  type LoginPayload,
} from '@/services/auth';
import { secureStore } from '@/utils/secure-store';
import { type Permission, normalizeRole, ROLE_PERMISSIONS, type Role } from '@/types/rbac';

const AUTH_STORAGE_KEY = 'auth-session';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
  permissions: Permission[];
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

type AuthState = {
  isHydrated: boolean;
  session: AuthSession | null;
  error: string | null;
};

let state: AuthState = {
  isHydrated: false,
  session: null,
  error: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<AuthState>) {
  state = { ...state, ...partial };
  emit();
}

function mapAuthError(error: unknown): { message: string; code: AuthApiErrorCode } {
  if (error instanceof AuthApiError) {
    return { message: error.message, code: error.code };
  }

  return { message: 'Ocurrió un error inesperado de autenticación.', code: 'UNKNOWN' };
}

function fromApiSession(apiSession: Awaited<ReturnType<typeof loginRequest>>): AuthSession {
  const role = normalizeRole(apiSession.user.role);
  const fallbackPermissions = ROLE_PERMISSIONS[role];

  return {
    accessToken: apiSession.accessToken,
    refreshToken: apiSession.refreshToken,
    expiresAt: Date.now() + apiSession.expiresIn * 1000,
    user: {
      ...apiSession.user,
      role,
      permissions: apiSession.user.permissions ?? fallbackPermissions,
    },
  };
}

async function persistSession(session: AuthSession | null) {
  if (!session) {
    await secureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return;
  }

  await secureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
}

async function bootstrapCurrentUserPermissions(session: AuthSession): Promise<AuthSession> {
  try {
    const currentUser = await getCurrentUser(session.accessToken);
    const role = normalizeRole(currentUser.role);

    return {
      ...session,
      user: {
        ...session.user,
        ...currentUser,
        role,
        permissions: currentUser.permissions ?? ROLE_PERMISSIONS[role],
      },
    };
  } catch {
    return session;
  }
}

async function updateSessionFromRefresh(payload: { accessToken: string; refreshToken: string; expiresIn: number }) {
  if (!state.session) {
    return;
  }

  const updatedSession: AuthSession = {
    ...state.session,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  };

  await persistSession(updatedSession);
  setState({ session: updatedSession });
}

configureHttpAuth({
  getSession: () => state.session,
  onSessionUpdated: updateSessionFromRefresh,
  onSessionExpired: logout,
});

export async function hydrateAuthSession() {
  const raw = await secureStore.getItemAsync(AUTH_STORAGE_KEY);

  if (!raw) {
    setState({ isHydrated: true, session: null });
    return;
  }

  const parsed = JSON.parse(raw) as AuthSession;
  setState({ isHydrated: true, session: parsed });

  if (parsed.expiresAt <= Date.now()) {
    await refreshSession();
  }
}

export async function login(payload: LoginPayload) {
  try {
    const response = await loginRequest(payload);

    if (response.user.status === 'inactive') {
      throw new AuthApiError('USER_INACTIVE', 'Tu cuenta está inactiva. Contacta al administrador.');
    }

    let session = fromApiSession(response);
    session = await bootstrapCurrentUserPermissions(session);

    await persistSession(session);
    setState({ session, error: null });
  } catch (error) {
    const { message } = mapAuthError(error);
    setState({ error: message });
    throw error;
  }
}

export async function logout() {
  await persistSession(null);
  setState({ session: null, error: null });
}

export async function refreshSession() {
  if (!state.session?.refreshToken) {
    await logout();
    return;
  }

  try {
    const response = await refreshRequest(state.session.refreshToken);
    let session = fromApiSession(response);
    session = await bootstrapCurrentUserPermissions(session);

    await persistSession(session);
    setState({ session, error: null });
  } catch (error) {
    const { code, message } = mapAuthError(error);
    if (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') {
      await logout();
      setState({ error: 'La sesión ha expirado. Inicia sesión nuevamente.' });
      return;
    }

    setState({ error: message });
    throw error;
  }
}

export function getAuthSession() {
  return state.session;
}

export function useAuthStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}
