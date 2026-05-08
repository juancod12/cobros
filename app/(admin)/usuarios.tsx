import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, Label, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import {
  createUser,
  getRoleOptions,
  getUsers,
  updateUserRole,
  updateUserStatus,
  type AdminUserStatus,
} from '@/services/admin-users';
import { getBranches, getCompanies } from '@/services/enterprise';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

const STATUS_OPTIONS: { label: string; value: '' | AdminUserStatus }[] = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Inactivos', value: 'INACTIVE' },
  { label: 'Suspendidos', value: 'SUSPENDED' },
];

function translateStatus(status: AdminUserStatus) {
  if (status === 'ACTIVE') return 'Activo';
  if (status === 'INACTIVE') return 'Inactivo';
  return 'Suspendido';
}

export default function UsuariosScreen() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const userPermissions = session?.user.permissions ?? [];
  const hasAccess = can(PERMISSIONS.MANAGE_USERS, userPermissions);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | AdminUserStatus>('');
  const [roleFilter, setRoleFilter] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cc, setCc] = useState('');
  const [password, setPassword] = useState('');
  const [newUserRoleCode, setNewUserRoleCode] = useState('COLLECTOR');
  const [newUserStatus, setNewUserStatus] = useState<AdminUserStatus>('ACTIVE');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');
  const [newUserBranchId, setNewUserBranchId] = useState('');

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers({
      search: searchFilter || undefined,
      status: statusFilter || undefined,
      roleCode: roleFilter || undefined,
    }),
    queryFn: () =>
      getUsers({
        search: searchFilter || undefined,
        status: statusFilter || undefined,
        roleCode: roleFilter || undefined,
      }),
    enabled: hasAccess,
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.adminRoles(),
    queryFn: getRoleOptions,
    enabled: hasAccess,
  });

  const companiesQuery = useQuery({
    queryKey: queryKeys.companies(),
    queryFn: getCompanies,
    enabled: hasAccess,
  });

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches(newUserCompanyId || undefined),
    queryFn: () => getBranches(newUserCompanyId || undefined),
    enabled: hasAccess && Boolean(newUserCompanyId),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setFullName('');
      setEmail('');
      setCc('');
      setPassword('');
      setNewUserRoleCode('COLLECTOR');
      setNewUserStatus('ACTIVE');
      setNewUserCompanyId('');
      setNewUserBranchId('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { userId: string; status: AdminUserStatus }) =>
      updateUserStatus(payload.userId, payload.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { userId: string; roleCode: string }) =>
      updateUserRole(payload.userId, payload.roleCode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  const roleCodeOptions = useMemo(
    () => (rolesQuery.data ?? []).map((role) => role.code),
    [rolesQuery.data]
  );

  const errorMessage =
    createMutation.error || updateStatusMutation.error || updateRoleMutation.error
      ? toApiError(
          createMutation.error ?? updateStatusMutation.error ?? updateRoleMutation.error,
          'No fue posible completar la operacion de usuarios.'
        ).message
      : null;

  if (!hasAccess) {
    return <AccessDenied message="Tu rol no tiene acceso a la administracion de usuarios." />;
  }

  return (
    <AppShell>
      <PageTitle title="Usuarios" subtitle="Gestion enterprise de cuentas, rol y estado operativo." />

      <Card>
        <SectionTitle>Filtros</SectionTitle>
        <Label>Buscar por nombre, correo, documento o ID</Label>
        <AppInput value={searchFilter} onChangeText={setSearchFilter} autoCapitalize="none" />
        <Label>Estado</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.label}
              active={statusFilter === option.value}
              label={option.label}
              onPress={() => setStatusFilter(option.value)}
            />
          ))}
        </View>
        <Label>Rol</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip active={roleFilter === ''} label="Todos" onPress={() => setRoleFilter('')} />
          {roleCodeOptions.map((roleCode) => (
            <Chip
              key={roleCode}
              active={roleFilter === roleCode}
              label={roleCode}
              onPress={() => setRoleFilter(roleCode)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Crear usuario</SectionTitle>
        <AppInput placeholder="Nombre completo" value={fullName} onChangeText={setFullName} />
        <AppInput placeholder="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <AppInput placeholder="Documento (CC)" value={cc} onChangeText={setCc} />
        <AppInput placeholder="Contrasena inicial" value={password} onChangeText={setPassword} secureTextEntry />
        <Label>Rol</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {roleCodeOptions.map((roleCode) => (
            <Chip
              key={roleCode}
              active={newUserRoleCode === roleCode}
              label={roleCode}
              onPress={() => setNewUserRoleCode(roleCode)}
            />
          ))}
        </View>
        <Label>Estado inicial</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_OPTIONS.filter((option) => option.value !== '').map((option) => (
            <Chip
              key={option.label}
              active={newUserStatus === option.value}
              label={option.label}
              onPress={() => setNewUserStatus(option.value as AdminUserStatus)}
            />
          ))}
        </View>
        <Label>Empresa (opcional)</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            active={newUserCompanyId === ''}
            label="Sin empresa"
            onPress={() => {
              setNewUserCompanyId('');
              setNewUserBranchId('');
            }}
          />
          {(companiesQuery.data ?? []).map((company) => (
            <Chip
              key={company.id}
              active={newUserCompanyId === company.id}
              label={company.name}
              onPress={() => {
                setNewUserCompanyId(company.id);
                setNewUserBranchId('');
              }}
            />
          ))}
        </View>
        {newUserCompanyId ? (
          <>
            <Label>Sucursal (opcional)</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip active={newUserBranchId === ''} label="Sin sucursal" onPress={() => setNewUserBranchId('')} />
              {(branchesQuery.data ?? []).map((branch) => (
                <Chip
                  key={branch.id}
                  active={newUserBranchId === branch.id}
                  label={branch.name}
                  onPress={() => setNewUserBranchId(branch.id)}
                />
              ))}
            </View>
          </>
        ) : null}
        <AppButton
          label={createMutation.isPending ? 'Creando usuario...' : 'Crear usuario'}
          onPress={() =>
            createMutation.mutate({
              fullName,
              email,
              cc,
              password,
              roleCode: newUserRoleCode,
              status: newUserStatus,
              companyId: newUserCompanyId || undefined,
              branchId: newUserBranchId || undefined,
            })
          }
          disabled={createMutation.isPending || roleCodeOptions.length === 0}
        />
      </Card>

      <ApiFeedback
        isLoading={usersQuery.isLoading || rolesQuery.isLoading || companiesQuery.isLoading}
        error={
          errorMessage ??
          (usersQuery.error
            ? toApiError(usersQuery.error, 'No fue posible cargar usuarios.').message
            : rolesQuery.error
              ? toApiError(rolesQuery.error, 'No fue posible cargar roles.').message
              : companiesQuery.error
                ? toApiError(companiesQuery.error, 'No fue posible cargar empresas.').message
                : branchesQuery.error
                  ? toApiError(branchesQuery.error, 'No fue posible cargar sucursales.').message
                  : null)
        }
      />

      {(usersQuery.data ?? []).map((user) => {
        const roleIndex = roleCodeOptions.findIndex((role) => role === user.roleCode);
        const nextRoleCode =
          roleCodeOptions.length > 0
            ? roleCodeOptions[(roleIndex + 1 + roleCodeOptions.length) % roleCodeOptions.length]
            : null;
        const nextStatus: AdminUserStatus =
          user.status === 'ACTIVE' ? 'INACTIVE' : user.status === 'INACTIVE' ? 'SUSPENDED' : 'ACTIVE';

        return (
          <Card key={user.id}>
            <Text style={{ color: ui.colors.text, fontWeight: '700', fontSize: 16 }}>{user.fullName}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Correo: {user.email}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Documento: {user.cc}</Text>
            <Text style={{ color: ui.colors.textMuted }}>ID: {user.id}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Rol: {user.roleCode ?? 'Sin rol'}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {translateStatus(user.status)}</Text>
            {user.lastLoginAt ? (
              <Text style={{ color: ui.colors.textMuted }}>
                Ultimo acceso: {new Date(user.lastLoginAt).toLocaleString('es-CO')}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <AppButton
                variant="secondary"
                label={
                  updateStatusMutation.isPending
                    ? 'Actualizando estado...'
                    : `Cambiar estado a ${translateStatus(nextStatus)}`
                }
                onPress={() => updateStatusMutation.mutate({ userId: user.id, status: nextStatus })}
                disabled={updateStatusMutation.isPending}
              />
              {nextRoleCode ? (
                <AppButton
                  variant="secondary"
                  label={
                    updateRoleMutation.isPending
                      ? 'Actualizando rol...'
                      : `Cambiar rol a ${nextRoleCode}`
                  }
                  onPress={() => updateRoleMutation.mutate({ userId: user.id, roleCode: nextRoleCode })}
                  disabled={updateRoleMutation.isPending}
                />
              ) : null}
            </View>
          </Card>
        );
      })}
    </AppShell>
  );
}
