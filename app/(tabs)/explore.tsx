import { Text } from 'react-native';

import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';

export default function ExploreScreen() {
  return (
    <AppShell>
      <PageTitle title="Centro de ayuda" subtitle="Guia rapida de uso de la aplicacion." />
      <Card>
        <SectionTitle>Flujo recomendado</SectionTitle>
        <Text style={{ color: ui.colors.textMuted }}>1. Apertura de caja</Text>
        <Text style={{ color: ui.colors.textMuted }}>2. Registro de clientes y prestamos</Text>
        <Text style={{ color: ui.colors.textMuted }}>3. Registro de pagos y gastos</Text>
        <Text style={{ color: ui.colors.textMuted }}>4. Cierre de caja y reporte diario</Text>
      </Card>
    </AppShell>
  );
}
