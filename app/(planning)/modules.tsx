import { Pressable, Text } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { modules } from '@/data/mvp-structure';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function ModulesScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.VIEW_MODULES, userPermissions)) {
    return <AccessDenied message="Tu rol no puede consultar la vista de modulos." />;
  }

  return (
    <AppShell>
      <PageTitle title="Modulos y submodulos" subtitle="Guia de priorizacion funcional del MVP." />
      <Card>
        <SectionTitle>Acciones criticas</SectionTitle>
        <Pressable style={{ backgroundColor: ui.colors.primarySoft, borderRadius: 12, padding: 10 }}>
          <Text style={{ color: ui.colors.text, fontWeight: '700' }}>Crear usuario</Text>
        </Pressable>
        <Pressable style={{ backgroundColor: ui.colors.primarySoft, borderRadius: 12, padding: 10 }}>
          <Text style={{ color: ui.colors.text, fontWeight: '700' }}>Cerrar caja de otro cobrador</Text>
        </Pressable>
      </Card>
      {modules.map((module) => (
        <Card key={module.id}>
          <SectionTitle>{module.name}</SectionTitle>
          <Text style={{ color: ui.colors.textMuted }}>{module.objective}</Text>
          <Text style={{ color: ui.colors.primary, fontWeight: '700' }}>{module.mvpPhase}</Text>
          {module.submodules.map((submodule) => (
            <Card key={`${module.id}-${submodule.name}`} style={{ backgroundColor: ui.colors.surfaceMuted }}>
              <Text style={{ color: ui.colors.text, fontWeight: '700' }}>{submodule.name}</Text>
              <Text style={{ color: ui.colors.textMuted }}>{submodule.description}</Text>
              {submodule.logicFocus.map((focus) => (
                <Text key={`${submodule.name}-${focus}`} style={{ color: ui.colors.textMuted }}>
                  - {focus}
                </Text>
              ))}
            </Card>
          ))}
        </Card>
      ))}
    </AppShell>
  );
}
