import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, PageTitle } from '@/components/ui/ui-kit';
import { createClient } from '@/services/clients';
import { queryKeys } from '@/services/query-keys';
import { toApiError } from '@/types/api-error';

export default function NewClientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [document, setDocument] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [score, setScore] = useState('600');

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);
      router.replace('/cobros/clients');
    },
  });

  return (
    <AppShell>
      <PageTitle title="Nuevo cliente" subtitle="Registra un cliente para iniciar su gestion de cobro." />
      <Card>
        <AppInput placeholder="Documento" value={document} onChangeText={setDocument} />
        <AppInput placeholder="Nombre" value={name} onChangeText={setName} />
        <AppInput placeholder="Contacto" value={contact} onChangeText={setContact} />
        <AppInput placeholder="Score" value={score} onChangeText={setScore} keyboardType="numeric" />
        <ApiFeedback error={mutation.error ? toApiError(mutation.error, 'No fue posible guardar cliente.').message : null} />
        <AppButton
          label={mutation.isPending ? 'Guardando...' : 'Guardar cliente'}
          onPress={() => mutation.mutate({ document, name, contact, score: Number(score) })}
          disabled={mutation.isPending}
        />
      </Card>
    </AppShell>
  );
}
