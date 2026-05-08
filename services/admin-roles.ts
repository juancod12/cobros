import { supabaseRequest } from '@/services/http';
import { ApiError } from '@/types/api-error';

export type AdminPermission = {
  id: string;
  code: string;
  name: string;
  description?: string;
};

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissions: string[];
};

export type RolesMatrix = {
  roles: AdminRole[];
  permissions: AdminPermission[];
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type PermissionRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type RolePermissionRow = {
  role_id: string;
  permission_id: string;
};

function mapPermission(row: PermissionRow): AdminPermission {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
  };
}

export async function getRolesMatrix(): Promise<RolesMatrix> {
  const [roles, permissions, rolePermissions] = await Promise.all([
    supabaseRequest<RoleRow[]>(
      '/roles',
      {
        query: {
          select: 'id,code,name,description',
          order: 'name.asc',
        },
      },
      'No fue posible consultar roles.'
    ),
    supabaseRequest<PermissionRow[]>(
      '/permissions',
      {
        query: {
          select: 'id,code,name,description',
          order: 'name.asc',
        },
      },
      'No fue posible consultar permisos.'
    ),
    supabaseRequest<RolePermissionRow[]>(
      '/role_permissions',
      {
        query: {
          select: 'role_id,permission_id',
        },
      },
      'No fue posible consultar asignaciones de permisos.'
    ),
  ]);

  const permissionsById = new Map(permissions.map((permission) => [permission.id, permission.code]));
  const codesByRole = rolePermissions.reduce<Record<string, string[]>>((acc, item) => {
    const permissionCode = permissionsById.get(item.permission_id);
    if (!permissionCode) {
      return acc;
    }

    if (!acc[item.role_id]) {
      acc[item.role_id] = [];
    }

    acc[item.role_id].push(permissionCode);
    return acc;
  }, {});

  return {
    roles: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? undefined,
      permissions: codesByRole[role.id] ?? [],
    })),
    permissions: permissions.map(mapPermission),
  };
}

export async function createRole(payload: { code: string; name: string; description?: string }) {
  const code = payload.code.trim().toUpperCase();
  const name = payload.name.trim();

  if (!code || !name) {
    throw new ApiError('VALIDATION_ERROR', 'Codigo y nombre del rol son obligatorios.');
  }

  const inserted = await supabaseRequest<RoleRow[] | RoleRow>(
    '/roles',
    {
      method: 'POST',
      query: { select: 'id,code,name,description' },
      body: {
        code,
        name,
        description: payload.description?.trim() || null,
      },
      preferRepresentation: true,
    },
    'No fue posible crear el rol.'
  );

  const role = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!role) {
    throw new ApiError('UNKNOWN', 'No se recibio el rol creado.');
  }

  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? undefined,
    permissions: [] as string[],
  };
}

export async function updateRolePermissions(roleId: string, permissionCodes: string[]) {
  if (!roleId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el rol a actualizar.');
  }

  const normalizedCodes = Array.from(
    new Set(permissionCodes.map((code) => code.trim()).filter(Boolean))
  );

  await supabaseRequest(
    '/role_permissions',
    {
      method: 'DELETE',
      query: { role_id: `eq.${roleId}` },
    },
    'No fue posible limpiar permisos actuales del rol.'
  );

  if (normalizedCodes.length === 0) {
    return;
  }

  const permissions = await supabaseRequest<PermissionRow[]>(
    '/permissions',
    {
      query: {
        select: 'id,code,name,description',
        code: `in.(${normalizedCodes.join(',')})`,
      },
    },
    'No fue posible validar permisos del rol.'
  );

  if (permissions.length === 0) {
    return;
  }

  const rows = permissions.map((permission) => ({
    role_id: roleId,
    permission_id: permission.id,
  }));

  await supabaseRequest(
    '/role_permissions',
    {
      method: 'POST',
      body: rows,
    },
    'No fue posible asignar los nuevos permisos al rol.'
  );
}
