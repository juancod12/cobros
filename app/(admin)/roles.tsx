import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, Label, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { createRole, getRolesMatrix, updateRolePermissions } from '@/services/admin-roles';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function RolesScreen() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const userPermissions = session?.user.permissions ?? [];
  const hasAccess = can(PERMISSIONS.MANAGE_USERS, userPermissions);

  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const matrixQuery = useQuery({
    queryKey: queryKeys.adminRoles(),
    queryFn: getRolesMatrix,
    enabled: hasAccess,
  });

  useEffect(() => {
    if (!matrixQuery.data) {
      return;
    }

    setDraftPermissions((current) => {
      const next = { ...current };
      matrixQuery.data.roles.forEach((role) => {
        if (!next[role.id]) {
          next[role.id] = [...role.permissions];
        }
      });
      return next;
    });
  }, [matrixQuery.data]);

  const saveRolePermissionsMutation = useMutation({
    mutationFn: (payload: { roleId: string; permissionCodes: string[] }) =>
      updateRolePermissions(payload.roleId, payload.permissionCodes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles() });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async () => {
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDescription('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles() });
    },
  });

  const combinedError =
    createRoleMutation.error || saveRolePermissionsMutation.error
      ? toApiError(
          createRoleMutation.error ?? saveRolePermissionsMutation.error,
          'No fue posible actualizar roles.'
        ).message
      : matrixQuery.error
        ? toApiError(matrixQuery.error, 'No fue posible cargar la matriz de roles.').message
        : null;

  const roleCards = useMemo(() => matrixQuery.data?.roles ?? [], [matrixQuery.data]);
  const permissions = useMemo(() => matrixQuery.data?.permissions ?? [], [matrixQuery.data]);

  if (!hasAccess) {
    return <AccessDenied message="Tu rol no tiene acceso a la administracion de roles." />;
  }

  return (
    <AppShell>
      <PageTitle title="Roles" subtitle="Define permisos y perfiles enterprise por tipo de usuario." />

      <Card>
        <SectionTitle>Crear rol</SectionTitle>
        <AppInput placeholder="Codigo (ej. SUPERVISOR)" value={newRoleCode} onChangeText={setNewRoleCode} autoCapitalize="characters" />
        <AppInput placeholder="Nombre del rol" value={newRoleName} onChangeText={setNewRoleName} />
        <AppInput placeholder="Descripcion (opcional)" value={newRoleDescription} onChangeText={setNewRoleDescription} />
        <AppButton
          label={createRoleMutation.isPending ? 'Creando rol...' : 'Crear rol'}
          onPress={() =>
            createRoleMutation.mutate({
              code: newRoleCode,
              name: newRoleName,
              description: newRoleDescription,
            })
          }
          disabled={createRoleMutation.isPending}
        />
      </Card>

      <ApiFeedback isLoading={matrixQuery.isLoading} error={combinedError} />

      {roleCards.map((role) => {
        const currentPermissions = draftPermissions[role.id] ?? role.permissions;
        const hasChanges =
          currentPermissions.length !== role.permissions.length ||
          currentPermissions.some((code) => !role.permissions.includes(code));

        return (
          <Card key={role.id}>
            <Text style={{ color: ui.colors.text, fontSize: 17, fontWeight: '700' }}>
              {role.name} ({role.code})
            </Text>
            {role.description ? <Text style={{ color: ui.colors.textMuted }}>{role.description}</Text> : null}
            <Label>Permisos</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {permissions.map((permission) => {
                const active = currentPermissions.includes(permission.code);
                return (
                  <Chip
                    key={`${role.id}-${permission.code}`}
                    active={active}
                    label={permission.code}
                    onPress={() => {
                      setDraftPermissions((current) => {
                        const existing = current[role.id] ?? role.permissions;
                        const next = active
                          ? existing.filter((code) => code !== permission.code)
                          : [...existing, permission.code];
                        return { ...current, [role.id]: next };
                      });
                    }}
                  />
                );
              })}
            </View>
            <AppButton
              variant="secondary"
              label={
                saveRolePermissionsMutation.isPending
                  ? 'Guardando permisos...'
                  : hasChanges
                    ? 'Guardar cambios de permisos'
                    : 'Sin cambios'
              }
              disabled={saveRolePermissionsMutation.isPending || !hasChanges}
              onPress={() =>
                saveRolePermissionsMutation.mutate({
                  roleId: role.id,
                  permissionCodes: currentPermissions,
                })
              }
            />
          </Card>
        );
      })}
    </AppShell>
  );
}
