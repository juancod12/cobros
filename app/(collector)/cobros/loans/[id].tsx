import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { Card, LinkButton, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getLoanById, getLoanInstallments } from '@/services/loans';
import { queryKeys } from '@/services/query-keys';
import { toApiError } from '@/types/api-error';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const formatMoney = (value: number) =>
    value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const loanQuery = useQuery({
    queryKey: queryKeys.loan(id ?? ''),
    queryFn: () => getLoanById(id ?? ''),
    enabled: Boolean(id),
  });

  const installmentsQuery = useQuery({
    queryKey: queryKeys.loanInstallments(id ?? ''),
    queryFn: () => getLoanInstallments(id ?? ''),
    enabled: Boolean(id),
  });

  return (
    <AppShell>
      <PageTitle title="Detalle de prestamo" />
      <ApiFeedback
        isLoading={loanQuery.isLoading || installmentsQuery.isLoading}
        error={
          loanQuery.error
            ? toApiError(loanQuery.error, 'No fue posible cargar el prestamo.').message
            : installmentsQuery.error
              ? toApiError(installmentsQuery.error, 'No fue posible cargar cuotas.').message
              : null
        }
      />
      {loanQuery.data ? (
        <Card>
          <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '800' }}>Cliente: {loanQuery.data.clientName ?? 'N/A'}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Principal: ${loanQuery.data.principal}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Interes: {loanQuery.data.interest}%</Text>
          <Text style={{ color: ui.colors.textMuted }}>Cuotas: {loanQuery.data.installments}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Pagadas/Pendientes: {loanQuery.data.installmentsPaid}/{loanQuery.data.installmentsPending}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Vencidas: {loanQuery.data.installmentsOverdue}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Total: ${formatMoney(loanQuery.data.totalDue)}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Pagado: ${formatMoney(loanQuery.data.paidTotal)}</Text>
          <Text style={{ color: ui.colors.text, fontWeight: '700' }}>Saldo: ${formatMoney(loanQuery.data.balance)}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Inicio: {loanQuery.data.startDate}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Cobrador: {loanQuery.data.collectorName ?? 'No asignado'}</Text>
          <LinkButton href={`/cobros/payments/new?loanId=${loanQuery.data.id}`}>Registrar pago para este prestamo</LinkButton>
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Cuotas ({installmentsQuery.data?.length ?? 0})</SectionTitle>
        {(installmentsQuery.data ?? []).map((installment) => (
          <Card key={installment.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.textMuted }}>Vence: {installment.dueDate}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Monto: ${installment.amount}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Pagado: ${installment.paidAmount ?? 0}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {installment.status}</Text>
          </Card>
        ))}
      </Card>
    </AppShell>
  );
}
