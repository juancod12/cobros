import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { PortfolioStatusBadge } from '@/components/collections/portfolio-status-badge';
import { AppShell } from '@/components/ui/app-shell';
import { AppInput, Card, Chip, LinkButton, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getClients, type PortfolioStatus } from '@/services/clients';
import { queryKeys } from '@/services/query-keys';
import { toApiError } from '@/types/api-error';

const statusOptions: { label: string; value: '' | PortfolioStatus }[] = [
  { label: 'Todos', value: '' },
  { label: 'Al dia', value: 'al_dia' },
  { label: 'Riesgo', value: 'riesgo' },
  { label: 'Moroso', value: 'moroso' },
  { label: 'Castigo', value: 'castigo' },
];

export default function ClientsScreen() {
  const [statusFilter, setStatusFilter] = useState<'' | PortfolioStatus>('');
  const [collectorFilter, setCollectorFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: queryKeys.clients({
      status: statusFilter || undefined,
      collector: collectorFilter || undefined,
      search: searchFilter || undefined,
    }),
    queryFn: () =>
      getClients({
        status: statusFilter || undefined,
        collector: collectorFilter || undefined,
        search: searchFilter || undefined,
      }),
  });

  const collectors = useMemo(
    () => Array.from(new Set(clients.map((client) => client.collectorName).filter(Boolean))) as string[],
    [clients]
  );

  return (
    <AppShell>
      <PageTitle title="Clientes" subtitle="Filtra cartera y consulta el estado por cobrador." />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Gestion</SectionTitle>
          <LinkButton href="/cobros/clients/new">+ Nuevo cliente</LinkButton>
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
        <SectionTitle>Buscar cliente</SectionTitle>
        <AppInput placeholder="Nombre, documento o ID cliente" value={searchFilter} onChangeText={setSearchFilter} />
      </Card>
      <ApiFeedback isLoading={isLoading} error={error ? toApiError(error, 'No fue posible cargar clientes.').message : null} />

      {clients.map((client) => (
        <Link key={client.id} href={`/cobros/clients/${client.id}`} asChild>
          <Pressable>
            <Card>
              <Text style={{ color: ui.colors.text, fontWeight: '700', fontSize: 16 }}>{client.name}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Documento: {client.document}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Contacto: {client.contact}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Score: {client.score}</Text>
              <Text style={{ color: ui.colors.textMuted }}>Cobrador: {client.collectorName ?? 'No asignado'}</Text>
              <PortfolioStatusBadge status={client.portfolioStatus} />
            </Card>
          </Pressable>
        </Link>
      ))}
    </AppShell>
  );
}
