import { Text } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

const roadmap = [
  { phase: 'Sprint 0 - Base tecnica', tasks: ['Definir repositorio monorepo.', 'Conectar Supabase.', 'Crear contratos de datos.'] },
  { phase: 'Sprint 1 - Auth y RBAC', tasks: ['Login seguro.', 'Creacion de usuarios por admin.', 'Matriz de permisos por rol.'] },
  { phase: 'Sprint 2 - Prestamos y cobros', tasks: ['CRUD clientes.', 'Crear prestamo y cuotas.', 'Registrar pagos y mora.'] },
  { phase: 'Sprint 3 - Caja y gastos', tasks: ['Apertura de caja.', 'Movimientos y gastos.', 'Cierre diario automatico/manual.'] },
  { phase: 'Sprint 4 - Dashboard y reportes', tasks: ['KPIs por cobrador.', 'Reportes PDF/Excel.', 'Notificaciones de riesgo.'] },
];

export default function RoadmapScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];

  if (!can(PERMISSIONS.VIEW_ROADMAP, userPermissions)) {
    return <AccessDenied message="Tu rol no puede consultar el roadmap." />;
  }

  return (
    <AppShell>
      <PageTitle title="Roadmap MVP" subtitle="Planeacion tecnica por sprint." />
      {roadmap.map((item) => (
        <Card key={item.phase}>
          <SectionTitle>{item.phase}</SectionTitle>
          {item.tasks.map((task) => (
            <Text key={`${item.phase}-${task}`} style={{ color: ui.colors.textMuted }}>
              - {task}
            </Text>
          ))}
        </Card>
      ))}
    </AppShell>
  );
}
