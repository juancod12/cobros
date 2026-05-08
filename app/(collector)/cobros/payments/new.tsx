import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getLoanInstallments, getLoans } from '@/services/loans';
import { createPayment } from '@/services/payments';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';

const paymentMethods = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Transferencia', value: 'TRANSFER' },
  { label: 'Nequi', value: 'NEQUI' },
  { label: 'Daviplata', value: 'DAVIPLATA' },
  { label: 'Otro', value: 'OTHER' },
] as const;

export default function NewPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ loanId?: string; installmentId?: string }>();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const collectorId = session?.user.id ?? '';
  const [loanSearch, setLoanSearch] = useState('');
  const [loanId, setLoanId] = useState(params.loanId ?? '');
  const [installmentId, setInstallmentId] = useState(params.installmentId ?? '');
  const [clientPaymentUuid, setClientPaymentUuid] = useState('');
  const [amount, setAmount] = useState('0');
  const [method, setMethod] = useState('CASH');
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');

  const amountValue = Number(amount);

  const loansQuery = useQuery({
    queryKey: queryKeys.loans({ search: loanSearch.trim() || undefined }),
    queryFn: () =>
      getLoans({
        search: loanSearch.trim() || undefined,
      }),
  });

  const selectedLoan = useMemo(
    () => (loansQuery.data ?? []).find((loan) => loan.id === loanId),
    [loansQuery.data, loanId]
  );

  const installmentsQuery = useQuery({
    queryKey: queryKeys.loanInstallments(loanId || ''),
    queryFn: () => getLoanInstallments(loanId),
    enabled: Boolean(loanId),
  });

  const selectableInstallments = useMemo(
    () => (installmentsQuery.data ?? []).filter((installment) => installment.status !== 'paid'),
    [installmentsQuery.data]
  );

  const formatMoney = (value: number) =>
    value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.loans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loan(variables.loanId ?? '') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loanInstallments(variables.loanId ?? '') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
      ]);

      if (variables.loanId) {
        router.replace(`/cobros/loans/${variables.loanId}`);
        return;
      }

      router.replace('/cobros/loans');
    },
  });

  const noLoansFound = !loansQuery.isLoading && (loansQuery.data?.length ?? 0) === 0;

  return (
    <AppShell>
      <PageTitle title="Registrar pago" subtitle="Recaudo con seleccion guiada de prestamo y cuota." />
      <Card>
        <SectionTitle>Seleccionar prestamo</SectionTitle>
        <AppInput
          placeholder="Buscar cliente, documento o ID del prestamo"
          value={loanSearch}
          onChangeText={setLoanSearch}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(loansQuery.data ?? []).slice(0, 8).map((loan) => (
            <Chip
              key={loan.id}
              active={loanId === loan.id}
              label={`${loan.clientName ?? 'Cliente'} | Saldo $${formatMoney(loan.balance)}`}
              onPress={() => {
                setLoanId(loan.id);
                setInstallmentId('');
              }}
            />
          ))}
        </View>
        {noLoansFound ? <Text style={{ color: ui.colors.textMuted }}>No hay prestamos para el filtro actual.</Text> : null}

        {selectedLoan ? (
          <Card style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.text, fontWeight: '700' }}>
              Cliente: {selectedLoan.clientName ?? selectedLoan.clientId ?? 'N/A'}
            </Text>
            <Text style={{ color: ui.colors.textMuted }}>Prestamo: {selectedLoan.id}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Saldo pendiente: ${formatMoney(selectedLoan.balance)}</Text>
            <Text style={{ color: ui.colors.textMuted }}>
              Cuotas pagadas/pendientes: {selectedLoan.installmentsPaid}/{selectedLoan.installmentsPending}
            </Text>
          </Card>
        ) : null}

        <SectionTitle>Cuota destino</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            active={installmentId === ''}
            label="Auto (primera pendiente)"
            onPress={() => setInstallmentId('')}
          />
          {selectableInstallments.slice(0, 10).map((installment) => (
            <Chip
              key={installment.id}
              active={installmentId === installment.id}
              label={`${installment.dueDate} | $${formatMoney(installment.amount)} | ${installment.status}`}
              onPress={() => setInstallmentId(installment.id)}
            />
          ))}
        </View>

        <AppInput placeholder="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <SectionTitle>Metodo</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {paymentMethods.map((option) => (
            <Chip
              key={option.value}
              active={method === option.value}
              label={option.label}
              onPress={() => setMethod(option.value)}
            />
          ))}
        </View>

        <AppInput
          placeholder="client_payment_uuid (opcional)"
          value={clientPaymentUuid}
          onChangeText={setClientPaymentUuid}
        />
        <AppInput placeholder="Evidencia (opcional)" value={evidence} onChangeText={setEvidence} />
        <AppInput placeholder="Notas (opcional)" value={notes} onChangeText={setNotes} />
        <ApiFeedback
          isLoading={loansQuery.isLoading || (Boolean(loanId) && installmentsQuery.isLoading)}
          error={
            loansQuery.error
              ? toApiError(loansQuery.error, 'No fue posible cargar prestamos.').message
              : installmentsQuery.error
                ? toApiError(installmentsQuery.error, 'No fue posible cargar cuotas del prestamo.').message
                : mutation.error
                  ? toApiError(mutation.error, 'No fue posible guardar pago.').message
                  : null
          }
        />
        <AppButton
          label={mutation.isPending ? 'Guardando...' : 'Guardar pago'}
          onPress={() =>
            mutation.mutate({
              amount: amountValue,
              method,
              client_payment_uuid: clientPaymentUuid || undefined,
              evidence,
              loanId,
              installmentId: installmentId || undefined,
              collectorId: collectorId || undefined,
              notes,
            })
          }
          disabled={mutation.isPending || !loanId || !Number.isFinite(amountValue) || amountValue <= 0}
        />
      </Card>
    </AppShell>
  );
}
