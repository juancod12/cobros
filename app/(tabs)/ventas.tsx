import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { ventasModuleItems } from '@/data/ventas-modules';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function VentasScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso al modulo de ventas." />;
  }

  return (
    <AppShell>
      <PageTitle title="Ventas y Cobros" subtitle="Control operativo del flujo comercial y recaudo." />

      <Card>
        <SectionTitle>Modulos de la pestana Ventas</SectionTitle>
        {ventasModuleItems.map((module) => (
          <Link href={module.href} key={module.label} style={styles.moduleLink}>
            <View style={styles.moduleRow}>
              <Text style={styles.moduleText}>{module.label}</Text>
              {module.trailingArrow ? <Ionicons color={ui.colors.textMuted} name="chevron-forward" size={16} /> : null}
            </View>
          </Link>
        ))}
      </Card>

      <Card>
        <SectionTitle>Proximamente</SectionTitle>
        <Text style={{ color: ui.colors.textMuted }}>- Alertas de desbalance por venta y caja.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- KPIs de rendimiento por unidad y cobrador.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Automatizacion de transferencias y limpiezas.</Text>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  moduleLink: {
    backgroundColor: ui.colors.surfaceMuted,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    color: ui.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  moduleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleText: {
    color: ui.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
