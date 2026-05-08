import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { Card, LinkButton, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getCashSession, type CashSessionStatus } from '@/services/cash';
import { queryKeys } from '@/services/query-keys';
import { useCashSessionStore } from '@/store/cash-session-store';
import { toApiError } from '@/types/api-error';

function translateStatus(status: CashSessionStatus) {
  if (status === 'OPEN') return 'Abierta';
  if (status === 'CLOSED') return 'Cerrada';
  return 'Cierre automatico';
}

export default function CashSessionScreen() {
  const { currentSession } = useCashSessionStore();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.cashSession(currentSession?.id ?? ''),
    queryFn: () => getCashSession(currentSession!.id),
    enabled: Boolean(currentSession?.id),
  });

  if (!currentSession) {
    return (
      <AppShell>
        <PageTitle title="Sesion de caja" subtitle="No hay una sesion activa." />
        <Card>
          <LinkButton href="/caja/open">Ir a apertura de caja</LinkButton>
        </Card>
      </AppShell>
    );
  }

  const session = data ?? currentSession;

  return (
    <AppShell>
      <PageTitle title="Caja activa" subtitle="Monitorea el estado de la jornada." />
      <ApiFeedback isLoading={isLoading} error={error ? toApiError(error, 'No fue posible cargar la sesion.').message : null} />
      <Card>
        <SectionTitle>Resumen</SectionTitle>
        <Text style={{ color: ui.colors.text }}>Estado: {translateStatus(session.status)}</Text>
        <Text style={{ color: ui.colors.text }}>Saldo apertura: ${session.openingBalance}</Text>
        <Text style={{ color: ui.colors.text }}>Ingresos: ${session.totalIncome}</Text>
        <Text style={{ color: ui.colors.text }}>Salidas: ${session.totalOutflow}</Text>
        <Text style={{ color: ui.colors.text }}>Gastos: ${session.totalExpenses}</Text>
        <Text style={{ color: ui.colors.text }}>Saldo esperado: ${session.expectedBalance}</Text>
      </Card>
      <Card>
        <LinkButton href="/caja/movements">+ Registrar movimiento</LinkButton>
        <LinkButton href="/caja/expenses">+ Registrar gasto</LinkButton>
        <LinkButton href="/caja/close">Cerrar caja</LinkButton>
      </Card>
    </AppShell>
  );
}
