import { Text } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, LinkButton, PageTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function GastosScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.REGISTER_EXPENSE, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso al modulo de gastos." />;
  }

  return (
    <AppShell scroll={false}>
      <PageTitle title="Gastos" subtitle="Control de egresos operativos vinculados a caja." />
      <Card>
        <Text style={{ color: ui.colors.textMuted }}>Registra salidas para mantener el cierre diario consistente.</Text>
        <LinkButton href="/caja/expenses">Ir a registrar gasto en caja</LinkButton>
      </Card>
    </AppShell>
  );
}
