import { supabaseRequest } from '@/services/http';
import { getAuthSession } from '@/store/auth-store';
import { ApiError } from '@/types/api-error';

export type PaymentPayload = {
  amount: number;
  method: string;
  client_payment_uuid?: string;
  evidence?: string;
  loanId?: string;
  installmentId?: string;
  collectorId?: string;
  notes?: string;
};

type PaymentInsertRow = {
  id: string;
  loan_id: string;
  installment_id: string | null;
  collector_id: string;
  amount: number;
  paid_at: string;
};

type InstallmentStatus = 'PENDING' | 'PAID' | 'LATE' | 'SKIPPED';
type LoanStatus = 'ACTIVE' | 'PAID' | 'IN_ARREARS' | 'IN_COLLECTION' | 'WRITEOFF';
type ClientTrafficLight = 'AL_DIA' | 'EN_RIESGO' | 'MOROSO' | 'CASTIGO';

type InstallmentRow = {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  status: InstallmentStatus;
  paid_at: string | null;
};

type ComputedInstallment = InstallmentRow & {
  paid_amount: number;
  next_status: InstallmentStatus;
  next_paid_at: string | null;
};

type PaymentRow = {
  installment_id: string | null;
  amount: number;
  paid_at: string;
};

type LoanStateRow = {
  id: string;
  client_id: string;
  status: LoanStatus;
  arrears_days: number;
  moved_to_writeoff_at: string | null;
};

type SystemSettingsRow = {
  days_to_writeoff: number;
  sunday_counts: boolean;
};

type OpenCashSessionRow = {
  id: string;
};

type ExistingMovementRow = {
  id: string;
};

const MONEY_EPSILON = 0.01;

function normalizeMethod(method: string): 'CASH' | 'TRANSFER' | 'NEQUI' | 'DAVIPLATA' | 'OTHER' {
  const normalized = method.trim().toUpperCase();
  if (normalized === 'EFECTIVO' || normalized === 'CASH') return 'CASH';
  if (normalized === 'TRANSFER' || normalized === 'TRANSFERENCIA') return 'TRANSFER';
  if (normalized === 'NEQUI') return 'NEQUI';
  if (normalized === 'DAVIPLATA') return 'DAVIPLATA';
  return 'OTHER';
}

function randomHex(length: number) {
  const chars = '0123456789abcdef';
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function generateUuidV4() {
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
}

function normalizeDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toInstallmentStatus(
  installment: InstallmentRow,
  paidAmount: number,
  todayIsoDate: string
): InstallmentStatus {
  if (paidAmount + MONEY_EPSILON >= Number(installment.amount_due ?? 0)) {
    return 'PAID';
  }

  if (installment.due_date < todayIsoDate) {
    return 'LATE';
  }

  return 'PENDING';
}

function calculateArrearsDaysFromDueDate(
  dueDate: string,
  referenceIso: string,
  sundayCounts: boolean
) {
  const due = normalizeDateOnly(new Date(`${dueDate}T00:00:00.000Z`));
  const reference = normalizeDateOnly(new Date(referenceIso));

  if (Number.isNaN(due.getTime()) || Number.isNaN(reference.getTime()) || reference <= due) {
    return 0;
  }

  const cursor = new Date(due);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  let days = 0;
  while (cursor <= reference) {
    const isSunday = cursor.getUTCDay() === 0;
    if (sundayCounts || !isSunday) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return Math.max(days, 0);
}

function resolveClientTrafficLight(loans: LoanStateRow[]): ClientTrafficLight {
  if (loans.some((loan) => loan.status === 'WRITEOFF')) {
    return 'CASTIGO';
  }

  if (
    loans.some(
      (loan) =>
        loan.arrears_days > 30 ||
        (loan.status === 'IN_ARREARS' && loan.arrears_days > 30)
    )
  ) {
    return 'MOROSO';
  }

  if (
    loans.some(
      (loan) =>
        loan.status === 'IN_ARREARS' ||
        loan.status === 'IN_COLLECTION' ||
        loan.arrears_days > 0
    )
  ) {
    return 'EN_RIESGO';
  }

  return 'AL_DIA';
}

async function getLoanState(loanId: string) {
  const rows = await supabaseRequest<LoanStateRow[]>(
    '/loans',
    {
      query: {
        select: 'id,client_id,status,arrears_days,moved_to_writeoff_at',
        id: `eq.${loanId}`,
        limit: 1,
      },
    },
    'No fue posible consultar el estado del prestamo.'
  );

  return rows[0];
}

async function getLoanInstallments(loanId: string) {
  return supabaseRequest<InstallmentRow[]>(
    '/installments',
    {
      query: {
        select: 'id,loan_id,installment_number,due_date,amount_due,status,paid_at',
        loan_id: `eq.${loanId}`,
        order: 'installment_number.asc',
      },
    },
    'No fue posible consultar las cuotas del prestamo.'
  );
}

async function getLoanPayments(loanId: string) {
  return supabaseRequest<PaymentRow[]>(
    '/payments',
    {
      query: {
        select: 'installment_id,amount,paid_at',
        loan_id: `eq.${loanId}`,
      },
    },
    'No fue posible consultar los pagos del prestamo.'
  );
}

async function resolveTargetInstallmentId(loanId: string, requestedInstallmentId?: string) {
  const requestedId = requestedInstallmentId?.trim();

  if (requestedId) {
    const rows = await supabaseRequest<InstallmentRow[]>(
      '/installments',
      {
        query: {
          select: 'id,loan_id,installment_number,due_date,amount_due,status,paid_at',
          id: `eq.${requestedId}`,
          loan_id: `eq.${loanId}`,
          limit: 1,
        },
      },
      'No fue posible validar la cuota seleccionada.'
    );

    if (!rows[0]) {
      throw new ApiError('VALIDATION_ERROR', 'La cuota indicada no pertenece al prestamo seleccionado.');
    }

    const installment = rows[0];
    const installmentPayments = await supabaseRequest<PaymentRow[]>(
      '/payments',
      {
        query: {
          select: 'installment_id,amount,paid_at',
          installment_id: `eq.${requestedId}`,
        },
      },
      'No fue posible validar pagos de la cuota seleccionada.'
    );
    const paidAmount = roundMoney(
      installmentPayments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)
    );

    if (paidAmount + MONEY_EPSILON >= Number(installment.amount_due ?? 0)) {
      throw new ApiError('VALIDATION_ERROR', 'La cuota indicada ya se encuentra saldada.');
    }

    return requestedId;
  }

  const [installments, payments] = await Promise.all([getLoanInstallments(loanId), getLoanPayments(loanId)]);

  const paidByInstallment = payments.reduce<Record<string, number>>((acc, payment) => {
    if (!payment.installment_id) {
      return acc;
    }

    acc[payment.installment_id] = roundMoney((acc[payment.installment_id] ?? 0) + Number(payment.amount ?? 0));
    return acc;
  }, {});

  const target = installments.find((installment) => {
    const paidAmount = paidByInstallment[installment.id] ?? 0;
    return paidAmount + MONEY_EPSILON < Number(installment.amount_due ?? 0);
  });

  return target?.id ?? null;
}

async function syncInstallmentsState(loanId: string, paymentIsoDate: string) {
  const [installments, payments] = await Promise.all([getLoanInstallments(loanId), getLoanPayments(loanId)]);

  const paidByInstallment = payments.reduce<Record<string, number>>((acc, payment) => {
    if (!payment.installment_id) {
      return acc;
    }

    acc[payment.installment_id] = roundMoney((acc[payment.installment_id] ?? 0) + Number(payment.amount ?? 0));
    return acc;
  }, {});

  const lastPaymentByInstallment = payments.reduce<Record<string, string>>((acc, payment) => {
    if (!payment.installment_id) {
      return acc;
    }

    const current = acc[payment.installment_id];
    if (!current || new Date(payment.paid_at).getTime() > new Date(current).getTime()) {
      acc[payment.installment_id] = payment.paid_at;
    }

    return acc;
  }, {});

  const todayIsoDate = paymentIsoDate.slice(0, 10);

  const nextInstallments: ComputedInstallment[] = installments.map((installment) => {
    const paidAmount = paidByInstallment[installment.id] ?? 0;
    const nextStatus = toInstallmentStatus(installment, paidAmount, todayIsoDate);
    const nextPaidAt = nextStatus === 'PAID' ? lastPaymentByInstallment[installment.id] ?? installment.paid_at : null;
    return {
      ...installment,
      paid_amount: paidAmount,
      next_status: nextStatus,
      next_paid_at: nextPaidAt,
    };
  });

  const pendingUpdates = nextInstallments.filter(
    (installment) =>
      installment.status !== installment.next_status || installment.paid_at !== installment.next_paid_at
  );

  if (pendingUpdates.length > 0) {
    await Promise.all(
      pendingUpdates.map((installment) =>
        supabaseRequest(
          '/installments',
          {
            method: 'PATCH',
            query: { id: `eq.${installment.id}` },
            body: {
              status: installment.next_status,
              paid_at: installment.next_paid_at,
            },
          },
          'No fue posible actualizar el estado de cuotas.'
        )
      )
    );
  }

  const totalDue = roundMoney(
    installments.reduce((acc, installment) => acc + Number(installment.amount_due ?? 0), 0)
  );
  const paidTotal = roundMoney(
    payments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)
  );

  return { installments: nextInstallments, totalDue, paidTotal };
}

async function syncLoanAndClientState(loanId: string, paymentIsoDate: string) {
  const [loan, settings, syncedInstallments] = await Promise.all([
    getLoanState(loanId),
    supabaseRequest<SystemSettingsRow[]>(
      '/system_settings',
      { query: { select: 'days_to_writeoff,sunday_counts', limit: 1 } },
      'No fue posible consultar la configuracion del sistema.'
    ),
    syncInstallmentsState(loanId, paymentIsoDate),
  ]);

  if (!loan) {
    return;
  }

  const businessSettings = settings[0] ?? { days_to_writeoff: 45, sunday_counts: false };
  const overdueInstallments = syncedInstallments.installments.filter(
    (installment) => installment.next_status === 'LATE'
  );
  const allInstallmentsPaid =
    syncedInstallments.installments.length > 0 &&
    syncedInstallments.installments.every((installment) => installment.next_status === 'PAID');

  const earliestOverdueDate = overdueInstallments
    .map((installment) => installment.due_date)
    .sort()[0];
  const arrearsDays = earliestOverdueDate
    ? calculateArrearsDaysFromDueDate(earliestOverdueDate, paymentIsoDate, businessSettings.sunday_counts)
    : 0;

  let nextStatus: LoanStatus = 'ACTIVE';
  if (allInstallmentsPaid) {
    nextStatus = 'PAID';
  } else if (loan.status === 'WRITEOFF') {
    nextStatus = 'WRITEOFF';
  } else if (arrearsDays > businessSettings.days_to_writeoff) {
    nextStatus = 'WRITEOFF';
  } else if (arrearsDays > 0) {
    nextStatus = 'IN_ARREARS';
  }

  const nextWriteoffAt =
    nextStatus === 'WRITEOFF' ? loan.moved_to_writeoff_at ?? paymentIsoDate : null;

  if (
    loan.status !== nextStatus ||
    loan.arrears_days !== arrearsDays ||
    loan.moved_to_writeoff_at !== nextWriteoffAt
  ) {
    await supabaseRequest(
      '/loans',
      {
        method: 'PATCH',
        query: { id: `eq.${loan.id}` },
        body: {
          status: nextStatus,
          arrears_days: arrearsDays,
          moved_to_writeoff_at: nextWriteoffAt,
        },
      },
      'No fue posible actualizar el estado del prestamo.'
    );
  }

  const clientLoans = await supabaseRequest<LoanStateRow[]>(
    '/loans',
    {
      query: {
        select: 'id,client_id,status,arrears_days,moved_to_writeoff_at',
        client_id: `eq.${loan.client_id}`,
      },
    },
    'No fue posible consultar cartera del cliente.'
  );

  await supabaseRequest(
    '/clients',
    {
      method: 'PATCH',
      query: { id: `eq.${loan.client_id}` },
      body: {
        traffic_light: resolveClientTrafficLight(clientLoans),
        last_payment_at: paymentIsoDate,
      },
    },
    'No fue posible actualizar el estado del cliente.'
  );
}

async function registerIncomeInOpenCashSession(input: {
  paymentId: string;
  collectorId: string;
  loanId: string;
  amount: number;
  method: string;
}) {
  const existingMovement = await supabaseRequest<ExistingMovementRow[]>(
    '/cash_movements',
    {
      query: {
        select: 'id',
        ref_payment_id: `eq.${input.paymentId}`,
        limit: 1,
      },
    },
    'No fue posible validar movimiento de caja existente.'
  );

  if (existingMovement[0]) {
    return;
  }

  const sessions = await supabaseRequest<OpenCashSessionRow[]>(
    '/cash_sessions',
    {
      query: {
        select: 'id',
        collector_id: `eq.${input.collectorId}`,
        status: 'eq.OPEN',
        order: 'opened_at.desc',
        limit: 1,
      },
    },
    'No fue posible consultar caja abierta del cobrador.'
  );

  const openSession = sessions[0];
  if (!openSession) {
    return;
  }

  await supabaseRequest(
    '/cash_movements',
    {
      method: 'POST',
      body: {
        cash_session_id: openSession.id,
        type: 'IN',
        amount: Number(input.amount),
        concept: `Ingreso por pago (${input.method}) prestamo ${input.loanId.slice(0, 8)}`,
        ref_payment_id: input.paymentId,
        created_by: input.collectorId,
      },
    },
    'No fue posible registrar el ingreso automatico en caja.'
  );
}

export async function createPayment(payload: PaymentPayload) {
  const amount = Number(payload.amount);
  const loanId = payload.loanId?.trim();
  const collectorId = payload.collectorId?.trim() || getAuthSession()?.user.id;

  if (!loanId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id del prestamo.');
  }

  if (!collectorId) {
    throw new ApiError('VALIDATION_ERROR', 'No se encontro el cobrador autenticado.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'El monto del pago debe ser mayor a cero.');
  }

  const clientPaymentUuid = payload.client_payment_uuid?.trim() || generateUuidV4();
  const method = normalizeMethod(payload.method);
  const paidAt = new Date().toISOString();
  const installmentId = await resolveTargetInstallmentId(loanId, payload.installmentId);

  const inserted = await supabaseRequest<PaymentInsertRow[] | PaymentInsertRow>(
    '/payments',
    {
      method: 'POST',
      query: { select: 'id,loan_id,installment_id,collector_id,amount,paid_at' },
      body: {
        client_payment_uuid: clientPaymentUuid,
        loan_id: loanId,
        installment_id: installmentId,
        collector_id: collectorId,
        amount,
        paid_at: paidAt,
        method,
        evidence_url: payload.evidence?.trim() || null,
        notes: payload.notes?.trim() || null,
      },
      preferRepresentation: true,
    },
    'No fue posible registrar el pago.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row?.id) {
    throw new ApiError('UNKNOWN', 'No se recibio el id del pago creado.');
  }

  const warnings: string[] = [];

  try {
    await syncLoanAndClientState(loanId, paidAt);
  } catch {
    warnings.push('No se pudo sincronizar cartera y estado del cliente despues del pago.');
  }

  try {
    await registerIncomeInOpenCashSession({
      paymentId: row.id,
      collectorId,
      loanId,
      amount,
      method,
    });
  } catch {
    warnings.push('No se pudo registrar automaticamente el ingreso del pago en caja.');
  }

  if (warnings.length > 0) {
    return { id: row.id, warning: warnings.join(' ') };
  }

  return { id: row.id };
}
