import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { administracionModuleSections } from '@/data/administracion-modules';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function AdministracionScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.MANAGE_USERS, userPermissions)) {
    return <AccessDenied message="Solo el rol con permisos de administracion puede ingresar." />;
  }

  return (
    <AppShell>
      <PageTitle title="Administracion" subtitle="Gestion estructurada de plataforma, usuarios y clientes." />

      {administracionModuleSections.map((section) => (
        <Card key={section.id}>
          <SectionTitle>{section.label}</SectionTitle>
          {section.items.map((module) => (
            <Link href={module.href} key={module.label} style={styles.moduleLink}>
              <View style={styles.moduleRow}>
                <Text style={styles.moduleText}>{module.label}</Text>
                <Ionicons color={ui.colors.textMuted} name="chevron-forward" size={16} />
              </View>
            </Link>
          ))}
        </Card>
      ))}

      <Card>
        <SectionTitle>Proximamente</SectionTitle>
        <Text style={{ color: ui.colors.textMuted }}>- Flujo de aprobaciones para cambios sensibles.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Auditoria unificada por entidad y usuario.</Text>
        <Text style={{ color: ui.colors.textMuted }}>- Automatizacion de tareas de mantenimiento.</Text>
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
