import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, PageTitle } from '@/components/ui/ui-kit';
import { openCashSession } from '@/services/cash';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { setCurrentCashSession } from '@/store/cash-session-store';

export default function OpenCashSessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const [collectorId, setCollectorId] = useState(session?.user.id ?? '');
  const [openingBalance, setOpeningBalance] = useState('0');

  const mutation = useMutation({
    mutationFn: openCashSession,
    onSuccess: async (session) => {
      setCurrentCashSession(session);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);
      router.replace('/caja/session');
    },
  });

  return (
    <AppShell>
      <PageTitle title="Apertura de caja" subtitle="Inicia la sesion operativa del cobrador." />
      <Card>
        <AppInput placeholder="ID cobrador" value={collectorId} onChangeText={setCollectorId} />
        <AppInput placeholder="Saldo inicial" value={openingBalance} onChangeText={setOpeningBalance} keyboardType="numeric" />
        <ApiFeedback error={mutation.error ? 'No fue posible abrir caja.' : null} />
        <AppButton
          label={mutation.isPending ? 'Aperturando...' : 'Aperturar caja'}
          onPress={() => mutation.mutate({ collectorId, openingBalance: Number(openingBalance) })}
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
