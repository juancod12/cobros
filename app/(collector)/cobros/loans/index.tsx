import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { PortfolioStatusBadge } from '@/components/collections/portfolio-status-badge';
import { AppShell } from '@/components/ui/app-shell';
import { AppInput, Card, Chip, LinkButton, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import type { PortfolioStatus } from '@/services/clients';
import { getLoans } from '@/services/loans';
import { queryKeys } from '@/services/query-keys';
import { toApiError } from '@/types/api-error';

const statusOptions: { label: string; value: '' | PortfolioStatus }[] = [
  { label: 'Todos', value: '' },
  { label: 'Al dia', value: 'al_dia' },
  { label: 'Riesgo', value: 'riesgo' },
  { label: 'Moroso', value: 'moroso' },
  { label: 'Castigo', value: 'castigo' },
];

export default function LoansScreen() {
  const [statusFilter, setStatusFilter] = useState<'' | PortfolioStatus>('');
  const [collectorFilter, setCollectorFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const { data: loans = [], isLoading, error } = useQuery({
    queryKey: queryKeys.loans({
      status: statusFilter || undefined,
      collector: collectorFilter || undefined,
      search: searchFilter || undefined,
    }),
    queryFn: () =>
      getLoans({
        status: statusFilter || undefined,
        collector: collectorFilter || undefined,
        search: searchFilter || undefined,
      }),
  });

  const collectors = useMemo(
    () => Array.from(new Set(loans.map((loan) => loan.collectorName).filter(Boolean))) as string[],
    [loans]
  );

  const formatMoney = (value: number) =>
    value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <AppShell>
      <PageTitle title="Prestamos" subtitle="Gestion de cartera y seguimiento de riesgo." />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Gestion</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <LinkButton href="/cobros/loans/new">+ Nuevo prestamo</LinkButton>
            <LinkButton href="/cobros/payments/new">+ Registrar pago</LinkButton>
          </View>
        </View>
        <SectionTitle>Estado de cartera</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {statusOptions.map((option) => (
            <Chip key={option.label} active={statusFilter === option.value} label={option.label} onPress={() => setStatusFilter(option.value)} />
          ))}
        </View>
        <SectionTitle>Cobrador</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip active={collectorFilter === ''} label="Todos" onPress={() => setCollectorFilter('')} />
          {collectors.map((collector) => (
            <Chip key={collector} active={collectorFilter === collector} label={collector} onPress={() => setCollectorFilter(collector)} />
          ))}
        </View>
        <SectionTitle>Buscar cliente o ID prestamo</SectionTitle>
        <AppInput placeholder="Nombre cliente, documento o ID" value={searchFilter} onChangeText={setSearchFilter} />
      </Card>
      <ApiFeedback isLoading={isLoading} error={error ? toApiError(error, 'No fue posible cargar prestamos.').message : null} />

      {loans.map((loan) => (
        <Link key={loan.id} href={`/cobros/loans/${loan.id}`} asChild>
          <Pressable>
            <Card>
              <Text style={{ color: ui.colors.text, fontWeight: '700', fontSize: 16 }}>Cliente: {loan.clientName ?? 'N/A'}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Principal: ${loan.principal}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Interes: {loan.interest}%</Text>
              <Text style={{ color: ui.colors.textMuted }}>Cuotas: {loan.installments}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Pagadas/Pendientes: {loan.installmentsPaid}/{loan.installmentsPending}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Vencidas: {loan.installmentsOverdue}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Total: ${formatMoney(loan.totalDue)}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Pagado: ${formatMoney(loan.paidTotal)}</Text>
              <Text style={{ color: ui.colors.text, fontWeight: '700' }}>Saldo: ${formatMoney(loan.balance)}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Inicio: {loan.startDate}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Cobrador: {loan.collectorName ?? 'No asignado'}</Text>
              <PortfolioStatusBadge status={loan.status} />
            </Card>
          </Pressable>
        </Link>
      ))}
    </AppShell>
  );
}
