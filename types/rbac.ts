export const ROLES = {
  ADMIN: 'ADMIN',
  AUX: 'AUX',
  COLLECTOR: 'COLLECTOR',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_HOME: 'VIEW_HOME',
  VIEW_MODULES: 'VIEW_MODULES',
  VIEW_ROADMAP: 'VIEW_ROADMAP',
  VIEW_PROFILE: 'VIEW_PROFILE',
  MANAGE_USERS: 'MANAGE_USERS',
  CLOSE_ANY_COLLECTOR_CASHBOX: 'CLOSE_ANY_COLLECTOR_CASHBOX',
  REGISTER_EXPENSE: 'REGISTER_EXPENSE',
} as const;

export const DB_PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  CLIENTS_MANAGE: 'clients.manage',
  LOANS_MANAGE: 'loans.manage',
  PAYMENTS_CREATE: 'payments.create',
  CASH_MANAGE: 'cash.manage',
  EXPENSES_MANAGE: 'expenses.manage',
  REPORTS_VIEW: 'reports.view',
} as const;

export type Permission =
  | (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
  | (typeof DB_PERMISSIONS)[keyof typeof DB_PERMISSIONS]
  | string;

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    PERMISSIONS.VIEW_HOME,
    PERMISSIONS.VIEW_MODULES,
    PERMISSIONS.VIEW_ROADMAP,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.CLOSE_ANY_COLLECTOR_CASHBOX,
    PERMISSIONS.REGISTER_EXPENSE,
  ],
  AUX: [
    PERMISSIONS.VIEW_HOME,
    PERMISSIONS.VIEW_MODULES,
    PERMISSIONS.VIEW_ROADMAP,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.REGISTER_EXPENSE,
  ],
  COLLECTOR: [
    PERMISSIONS.VIEW_HOME,
    PERMISSIONS.VIEW_MODULES,
    PERMISSIONS.VIEW_PROFILE,
  ],
};

export function normalizeRole(role?: string | null): Role {
  if (!role) {
    return ROLES.COLLECTOR;
  }

  const normalized = role.toUpperCase();
  if (normalized in ROLES) {
    return normalized as Role;
  }

  if (normalized === 'VIEWER') {
    return ROLES.COLLECTOR;
  }

  return ROLES.COLLECTOR;
}
