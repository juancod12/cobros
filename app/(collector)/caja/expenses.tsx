import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, PageTitle } from '@/components/ui/ui-kit';
import { registerCashExpense } from '@/services/cash';
import { queryKeys } from '@/services/query-keys';
import { addCashExpense, useCashSessionStore } from '@/store/cash-session-store';
import { toApiError } from '@/types/api-error';

export default function CashExpensesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentSession } = useCashSessionStore();
  const [category, setCategory] = useState('transporte');
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: { category: string; amount: number; note?: string }) => registerCashExpense(currentSession!.id, payload),
    onSuccess: async (expense) => {
      addCashExpense(expense);
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
        <PageTitle title="Registrar gasto" />
        <Card>
          <ApiFeedback error="No hay una sesion de caja activa." />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTitle title="Registrar gasto" subtitle="Asocia egresos operativos a la caja activa." />
      <Card>
        <AppInput placeholder="Categoria" value={category} onChangeText={setCategory} />
        <AppInput placeholder="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <AppInput placeholder="Nota" value={note} onChangeText={setNote} />
        <ApiFeedback error={mutation.error ? toApiError(mutation.error, 'No fue posible registrar gasto.').message : null} />
        <AppButton
          label={mutation.isPending ? 'Guardando...' : 'Guardar gasto'}
          onPress={() => mutation.mutate({ category, amount: Number(amount), note })}
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
