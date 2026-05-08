import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, PageTitle } from '@/components/ui/ui-kit';
import { closeCashSession } from '@/services/cash';
import { queryKeys } from '@/services/query-keys';
import { setCurrentCashSession, useCashSessionStore } from '@/store/cash-session-store';
import { toApiError } from '@/types/api-error';

export default function CloseCashSessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentSession } = useCashSessionStore();
  const [closingBalance, setClosingBalance] = useState('0');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: { closingBalance: number; note?: string }) => closeCashSession(currentSession!.id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashSession(currentSession!.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);
      setCurrentCashSession(null);
      router.replace('/caja/open');
    },
  });

  if (!currentSession) {
    return (
      <AppShell>
        <PageTitle title="Cerrar caja" />
        <Card>
          <ApiFeedback error="No hay una sesion de caja activa." />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle title="Cerrar caja" subtitle="Confirma el saldo final y registra observaciones." />
      <Card>
        <AppInput placeholder="Saldo de cierre" value={closingBalance} onChangeText={setClosingBalance} keyboardType="numeric" />
        <AppInput placeholder="Nota" value={note} onChangeText={setNote} />
        <ApiFeedback error={mutation.error ? toApiError(mutation.error, 'No fue posible cerrar caja.').message : null} />
        <AppButton
          label={mutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
          variant="danger"
          onPress={() => mutation.mutate({ closingBalance: Number(closingBalance), note })}
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
