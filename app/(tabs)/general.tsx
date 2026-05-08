import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { generalModuleItems, generalModulesMoreHref } from '@/data/general-modules';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function GeneralScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso al modulo general." />;
  }

  return (
    <AppShell>
      <PageTitle title="General" subtitle="Visibilidad transversal del estado del sistema." />

      <Card>
        <SectionTitle>Modulos de la pestana General</SectionTitle>
        {generalModuleItems.map((module) => (
          <Link href={module.href} key={module.label} style={styles.moduleLink}>
            <View style={styles.moduleRow}>
              <Text style={styles.moduleText}>{module.label}</Text>
              {module.trailingArrow ? <Ionicons color={ui.colors.textMuted} name="chevron-forward" size={16} /> : null}
            </View>
          </Link>
        ))}

        <Link href={generalModulesMoreHref} style={styles.moreLink}>
          Ver mas
        </Link>
      </Card>

      <Card>
        <SectionTitle>Proximamente</SectionTitle>
        <Text style={{ color: ui.colors.textMuted }}>- Bandeja unificada de aprobaciones por prioridad.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Alertas de facturacion y vencimientos.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Mapa en tiempo real con estado de unidades.</Text>
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
  moreLink: {
    alignSelf: 'flex-start',
    backgroundColor: '#6d11a3',
    borderRadius: ui.radius.md,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
