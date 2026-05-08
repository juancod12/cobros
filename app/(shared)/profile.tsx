import { useMemo } from 'react';
import { Text } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, Card, PageTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { logout, useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function ProfileScreen() {
  const { session, error } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  const expiresAt = useMemo(() => {
    if (!session?.expiresAt) return 'Sin sesion';
    return new Date(session.expiresAt).toLocaleString();
  }, [session?.expiresAt]);

  if (!can(PERMISSIONS.VIEW_PROFILE, userPermissions)) {
    return <AccessDenied message="Tu rol no puede consultar el perfil." />;
  }

  return (
    <AppShell scroll={false}>
      <PageTitle title="Perfil" subtitle="Datos de identidad, rol y sesion activa." />
      <Card>
        <Text style={{ color: ui.colors.text }}>Correo: {session?.user.email ?? '-'}</Text>
        <Text style={{ color: ui.colors.text }}>Nombre: {session?.user.name ?? '-'}</Text>
        <Text style={{ color: ui.colors.text }}>Rol: {session?.user.role ?? '-'}</Text>
        <Text style={{ color: ui.colors.text }}>Estado: {session?.user.status ?? '-'}</Text>
        <Text style={{ color: ui.colors.text }}>Permisos: {(session?.user.permissions ?? []).join(', ') || '-'}</Text>
        <Text style={{ color: ui.colors.text }}>Sesion expira: {expiresAt}</Text>
        {error ? <Text style={{ color: ui.colors.danger, fontWeight: '700' }}>{error}</Text> : null}
        <AppButton label="Cerrar sesion" variant="danger" onPress={logout} />
      </Card>
    </AppShell>
  );
}
