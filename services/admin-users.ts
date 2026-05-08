import { supabaseRequest } from '@/services/http';
import { getAuthSession } from '@/store/auth-store';
import { ApiError } from '@/types/api-error';
import type { Role } from '@/types/rbac';

export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type AdminUser = {
  id: string;
  authUserId?: string;
  fullName: string;
  email: string;
  cc: string;
  status: AdminUserStatus;
  roleCode?: Role | string;
  roleName?: string;
  companyId?: string;
  branchId?: string;
  lastLoginAt?: string;
  createdAt?: string;
};

export type AdminRoleOption = {
  id: string;
  code: string;
  name: string;
};

type UserRow = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  cc: string;
  status: AdminUserStatus;
  company_id?: string | null;
  branch_id?: string | null;
  last_login_at: string | null;
  created_at: string;
};

type RoleRef = {
  id: string;
  code: string;
  name: string;
};

type UserRoleRow = {
  user_id: string;
  role?: RoleRef | RoleRef[] | null;
};

const USER_SELECT_WITH_ORG =
  'id,auth_user_id,full_name,email,cc,status,company_id,branch_id,last_login_at,created_at';
const USER_SELECT_LEGACY = 'id,auth_user_id,full_name,email,cc,status,last_login_at,created_at';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function getRoleItem(role: UserRoleRow['role']) {
  if (!role) return undefined;
  if (Array.isArray(role)) return role[0];
  return role;
}

function mapUser(row: UserRow, role?: RoleRef): AdminUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? undefined,
    fullName: row.full_name,
    email: row.email,
    cc: row.cc,
    status: row.status,
    roleCode: role?.code,
    roleName: role?.name,
    companyId: row.company_id ?? undefined,
    branchId: row.branch_id ?? undefined,
    lastLoginAt: row.last_login_at ?? undefined,
    createdAt: row.created_at,
  };
}

function getErrorMessage(body: Record<string, unknown>, fallback: string) {
  if (typeof body.message === 'string' && body.message) {
    return body.message;
  }
  if (typeof body.msg === 'string' && body.msg) {
    return body.msg;
  }
  if (typeof body.error_description === 'string' && body.error_description) {
    return body.error_description;
  }
  if (typeof body.error === 'string' && body.error) {
    return body.error;
  }
  return fallback;
}

function isOrgColumnMissing(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('company_id') || message.includes('branch_id');
}

async function getUserRows() {
  try {
    const rows = await supabaseRequest<UserRow[]>(
      '/users',
      {
        query: {
          select: USER_SELECT_WITH_ORG,
          order: 'created_at.desc',
        },
      },
      'No fue posible consultar usuarios.'
    );

    return { rows, supportsOrgColumns: true };
  } catch (error) {
    if (!isOrgColumnMissing(error)) {
      throw error;
    }

    const legacyRows = await supabaseRequest<UserRow[]>(
      '/users',
      {
        query: {
          select: USER_SELECT_LEGACY,
          order: 'created_at.desc',
        },
      },
      'No fue posible consultar usuarios.'
    );

    return { rows: legacyRows, supportsOrgColumns: false };
  }
}

async function getUserRoles() {
  return supabaseRequest<UserRoleRow[]>(
    '/user_roles',
    {
      query: {
        select: 'user_id,role:roles!user_roles_role_id_fkey(id,code,name)',
      },
    },
    'No fue posible consultar roles de usuarios.'
  );
}

async function getRoleByCode(roleCode: string) {
  const rows = await supabaseRequest<RoleRef[]>(
    '/roles',
    {
      query: {
        select: 'id,code,name',
        code: `eq.${roleCode}`,
        limit: 1,
      },
    },
    'No fue posible consultar el rol solicitado.'
  );

  return rows[0];
}

async function ensureAuthUser(email: string, password: string, fullName: string, roleCode: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new ApiError(
      'UNKNOWN',
      'Falta configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName,
          role: roleCode,
          status: 'active',
        },
      }),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No hay conexion con Supabase Auth.');
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError('UNKNOWN', getErrorMessage(body, 'No fue posible crear credenciales de usuario.'), response.status, body);
  }

  const user = body.user as { id?: string } | undefined;
  return user?.id ?? null;
}

export async function getRoleOptions() {
  return supabaseRequest<AdminRoleOption[]>(
    '/roles',
    {
      query: {
        select: 'id,code,name',
        order: 'name.asc',
      },
    },
    'No fue posible consultar roles.'
  );
}

export async function getUsers(filters: {
  search?: string;
  status?: AdminUserStatus | '';
  roleCode?: string;
} = {}) {
  const [{ rows }, userRoles] = await Promise.all([getUserRows(), getUserRoles()]);

  const roleByUserId = userRoles.reduce<Record<string, RoleRef>>((acc, item) => {
    const role = getRoleItem(item.role);
    if (role) {
      acc[item.user_id] = role;
    }
    return acc;
  }, {});

  let users = rows.map((row) => mapUser(row, roleByUserId[row.id]));

  if (filters.status) {
    users = users.filter((user) => user.status === filters.status);
  }

  if (filters.roleCode) {
    const roleCode = filters.roleCode.toUpperCase();
    users = users.filter((user) => user.roleCode?.toUpperCase() === roleCode);
  }

  if (filters.search) {
    const search = filters.search.trim().toLowerCase();
    users = users.filter((user) => {
      if (user.id.toLowerCase().includes(search)) return true;
      if (user.fullName.toLowerCase().includes(search)) return true;
      if (user.email.toLowerCase().includes(search)) return true;
      if (user.cc.toLowerCase().includes(search)) return true;
      return false;
    });
  }

  return users;
}

export async function createUser(payload: {
  fullName: string;
  email: string;
  cc: string;
  password: string;
  roleCode: string;
  status?: AdminUserStatus;
  companyId?: string;
  branchId?: string;
}) {
  const fullName = payload.fullName.trim();
  const email = payload.email.trim().toLowerCase();
  const cc = payload.cc.trim();
  const password = payload.password;
  const roleCode = payload.roleCode.trim().toUpperCase();
  const status = payload.status ?? 'ACTIVE';

  if (!fullName || !email || !cc || !password || !roleCode) {
    throw new ApiError('VALIDATION_ERROR', 'Nombre, correo, documento, contraseña y rol son obligatorios.');
  }

  if (password.length < 8) {
    throw new ApiError('VALIDATION_ERROR', 'La contraseña debe tener al menos 8 caracteres.');
  }

  const role = await getRoleByCode(roleCode);
  if (!role) {
    throw new ApiError('VALIDATION_ERROR', 'El rol indicado no existe.');
  }

  const authUserId = await ensureAuthUser(email, password, fullName, roleCode);

  const baseBody = {
    auth_user_id: authUserId,
    full_name: fullName,
    email,
    cc,
    status,
    created_by: getAuthSession()?.user.id ?? null,
  } as Record<string, unknown>;

  if (payload.companyId?.trim()) {
    baseBody.company_id = payload.companyId.trim();
  }

  if (payload.branchId?.trim()) {
    baseBody.branch_id = payload.branchId.trim();
  }

  let inserted: UserRow[] | UserRow;
  try {
    inserted = await supabaseRequest<UserRow[] | UserRow>(
      '/users',
      {
        method: 'POST',
        query: { select: USER_SELECT_WITH_ORG },
        body: baseBody,
        preferRepresentation: true,
      },
      'No fue posible crear el usuario.'
    );
  } catch (error) {
    if (!isOrgColumnMissing(error)) {
      throw error;
    }

    const fallbackBody = { ...baseBody };
    delete fallbackBody.company_id;
    delete fallbackBody.branch_id;

    inserted = await supabaseRequest<UserRow[] | UserRow>(
      '/users',
      {
        method: 'POST',
        query: { select: USER_SELECT_LEGACY },
        body: fallbackBody,
        preferRepresentation: true,
      },
      'No fue posible crear el usuario.'
    );
  }

  const userRow = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!userRow?.id) {
    throw new ApiError('UNKNOWN', 'No se recibio el usuario creado.');
  }

  await supabaseRequest(
    '/user_roles',
    {
      method: 'DELETE',
      query: {
        user_id: `eq.${userRow.id}`,
      },
    },
    'No fue posible limpiar roles anteriores del usuario.'
  );

  await supabaseRequest(
    '/user_roles',
    {
      method: 'POST',
      body: {
        user_id: userRow.id,
        role_id: role.id,
      },
    },
    'No fue posible asignar el rol del usuario.'
  );

  return mapUser(userRow, role);
}

export async function updateUserStatus(userId: string, status: AdminUserStatus) {
  if (!userId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el usuario a actualizar.');
  }

  await supabaseRequest(
    '/users',
    {
      method: 'PATCH',
      query: { id: `eq.${userId}` },
      body: { status },
    },
    'No fue posible actualizar el estado del usuario.'
  );
}

export async function updateUserRole(userId: string, roleCode: string) {
  if (!userId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el usuario a actualizar.');
  }

  const normalizedRoleCode = roleCode.trim().toUpperCase();
  if (!normalizedRoleCode) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el rol a asignar.');
  }

  const role = await getRoleByCode(normalizedRoleCode);
  if (!role) {
    throw new ApiError('VALIDATION_ERROR', 'El rol indicado no existe.');
  }

  await supabaseRequest(
    '/user_roles',
    {
      method: 'DELETE',
      query: {
        user_id: `eq.${userId}`,
      },
    },
    'No fue posible actualizar el rol del usuario.'
  );

  await supabaseRequest(
    '/user_roles',
    {
      method: 'POST',
      body: {
        user_id: userId,
        role_id: role.id,
      },
    },
    'No fue posible asignar el rol del usuario.'
  );
}

export async function updateUserOrgAssignment(
  userId: string,
  payload: { companyId?: string; branchId?: string }
) {
  if (!userId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el usuario a actualizar.');
  }

  const body = {
    company_id: payload.companyId?.trim() || null,
    branch_id: payload.branchId?.trim() || null,
  };

  try {
    await supabaseRequest(
      '/users',
      {
        method: 'PATCH',
        query: { id: `eq.${userId}` },
        body,
      },
      'No fue posible actualizar empresa/sucursal del usuario.'
    );
  } catch (error) {
    if (isOrgColumnMissing(error)) {
      throw new ApiError('UNKNOWN', 'Debes aplicar la migracion enterprise para asignar empresa/sucursal.');
    }
    throw error;
  }
}
