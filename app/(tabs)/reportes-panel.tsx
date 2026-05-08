import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { reportesModuleItems } from '@/data/reportes-modules';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function ReportesPanelScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso al panel de reportes." />;
  }

  return (
    <AppShell>
      <PageTitle title="Reportes" subtitle="Consulta y exportacion de reportes operativos y administrativos." />

      <Card>
        <SectionTitle>Reportes disponibles</SectionTitle>
        {reportesModuleItems.map((module) => (
          <Link href={module.href} key={module.label} style={styles.moduleLink}>
            <View style={styles.moduleRow}>
              <Text style={styles.moduleText}>{module.label}</Text>
              <Ionicons color={ui.colors.textMuted} name="chevron-forward" size={16} />
            </View>
          </Link>
        ))}
      </Card>

      <Card>
        <SectionTitle>Proximamente</SectionTitle>
        <Text style={{ color: ui.colors.textMuted }}>- Programacion automatica de envios por correo.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Plantillas por rol para exportacion rapida.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Centro de historial de descargas.</Text>
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
