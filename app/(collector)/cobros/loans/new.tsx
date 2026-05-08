import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { getClients } from '@/services/clients';
import { createLoan } from '@/services/loans';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';

export default function NewLoanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [principal, setPrincipal] = useState('1000');
  const [interest, setInterest] = useState('20');
  const [installments, setInstallments] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectorId, setCollectorId] = useState(session?.user.id ?? '');

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients({ search: clientSearch || undefined }),
    queryFn: () => getClients({ search: clientSearch || undefined }),
  });

  const mutation = useMutation({
    mutationFn: createLoan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.loans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);
      router.replace('/cobros/loans');
    },
  });

  return (
    <AppShell>
      <PageTitle title="Nuevo prestamo" subtitle="Crea una operacion de cartera con sus condiciones base." />
      <Card>
        <SectionTitle>Seleccionar cliente</SectionTitle>
        <AppInput
          placeholder="Buscar cliente por nombre, documento o ID"
          value={clientSearch}
          onChangeText={setClientSearch}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(clientsQuery.data ?? []).slice(0, 8).map((client) => (
            <Chip
              key={client.id}
              active={clientId === client.id}
              label={client.name}
              onPress={() => setClientId(client.id)}
            />
          ))}
        </View>
        <AppInput placeholder="ID cliente" value={clientId} onChangeText={setClientId} />
        <AppInput placeholder="Principal" value={principal} onChangeText={setPrincipal} keyboardType="numeric" />
        <AppInput placeholder="Interes %" value={interest} onChangeText={setInterest} keyboardType="numeric" />
        <AppInput placeholder="Cuotas" value={installments} onChangeText={setInstallments} keyboardType="numeric" />
        <AppInput placeholder="Inicio (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
        <AppInput placeholder="ID cobrador" value={collectorId} onChangeText={setCollectorId} />
        <ApiFeedback
          isLoading={clientsQuery.isLoading}
          error={
            clientsQuery.error
              ? toApiError(clientsQuery.error, 'No fue posible cargar clientes.').message
              : mutation.error
                ? toApiError(mutation.error, 'No fue posible guardar prestamo.').message
                : null
          }
        />
        <AppButton
          label={mutation.isPending ? 'Guardando...' : 'Guardar prestamo'}
          onPress={() =>
            mutation.mutate({
              clientId,
              principal: Number(principal),
              interest: Number(interest),
              installments: Number(installments),
              startDate,
              collectorId,
            })
          }
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
