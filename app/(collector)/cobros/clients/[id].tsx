import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getClientById } from '@/services/clients';
import { queryKeys } from '@/services/query-keys';
import { toApiError } from '@/types/api-error';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: client, isLoading, error } = useQuery({
    queryKey: queryKeys.client(id ?? ''),
    queryFn: () => getClientById(id ?? ''),
    enabled: Boolean(id),
  });

  return (
    <AppShell>
      <PageTitle title="Detalle de cliente" />
      <ApiFeedback isLoading={isLoading} error={error ? toApiError(error, 'No fue posible cargar el cliente.').message : null} />
      {client ? (
        <Card>
          <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '800' }}>{client.name}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Documento: {client.document}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Contacto: {client.contact}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Score: {client.score}</Text>
          <Text style={{ color: ui.colors.textMuted }}>Cobrador: {client.collectorName ?? 'No asignado'}</Text>
        </Card>
      ) : null}
    </AppShell>
  );
}
