import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, PageTitle } from '@/components/ui/ui-kit';
import { registerCashMovement, type MovementType } from '@/services/cash';
import { queryKeys } from '@/services/query-keys';
import { addCashMovement, useCashSessionStore } from '@/store/cash-session-store';
import { toApiError } from '@/types/api-error';

export default function CashMovementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentSession } = useCashSessionStore();
  const [type, setType] = useState<MovementType>('IN');
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: { type: MovementType; amount: number; note?: string }) =>
      registerCashMovement(currentSession!.id, payload),
    onSuccess: async (movement) => {
      addCashMovement(movement);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cashSession(currentSession!.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);
      router.back();
    },
  });

  if (!currentSession) {
    return (
      <AppShell>
        <PageTitle title="Registrar movimiento" />
        <Card>
          <ApiFeedback error="No hay una sesion de caja activa." />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle title="Registrar movimiento" subtitle="Entrada, salida o ajuste de caja." />
      <Card>
        <AppInput placeholder="Tipo (IN/OUT/ADJUST)" value={type} onChangeText={(value) => setType(value as MovementType)} />
        <AppInput placeholder="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <AppInput placeholder="Nota" value={note} onChangeText={setNote} />
        <ApiFeedback error={mutation.error ? toApiError(mutation.error, 'No fue posible registrar movimiento.').message : null} />
        <AppButton
          label={mutation.isPending ? 'Guardando...' : 'Guardar movimiento'}
          onPress={() => mutation.mutate({ type, amount: Number(amount), note })}
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
