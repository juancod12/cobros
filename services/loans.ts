import { supabaseRequest } from '@/services/http';
import { ApiError } from '@/types/api-error';
import type { PortfolioStatus } from '@/services/clients';

export type Loan = {
  id: string;
  uuid?: string;
  clientId?: string;
  clientName?: string;
  principal: number;
  interest: number;
  installments: number;
  startDate: string;
  collectorId?: string;
  collectorName?: string;
  status?: PortfolioStatus;
  totalDue: number;
  paidTotal: number;
  balance: number;
  installmentsPaid: number;
  installmentsPending: number;
  installmentsOverdue: number;
};

export type Installment = {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'overdue';
};

export type LoanPayload = {
  principal: number;
  interest: number;
  installments: number;
  startDate: string;
  collectorId: string;
  clientId?: string;
};

type QueryFilters = {
  status?: string;
  collector?: string;
  search?: string;
};

type LoanStatus = 'ACTIVE' | 'PAID' | 'IN_ARREARS' | 'IN_COLLECTION' | 'WRITEOFF';

type LoanRow = {
  id: string;
  client_id: string;
  collector_id: string;
  principal: number;
  interest_rate: number;
  total_due: number;
  term_installments: number;
  start_date: string;
  status: LoanStatus;
  arrears_days: number;
  client?: { full_name: string } | { full_name: string }[] | null;
  collector?: { full_name: string } | { full_name: string }[] | null;
};

type InstallmentRow = {
  id: string;
  due_date: string;
  amount_due: number;
  status: 'PENDING' | 'PAID' | 'LATE' | 'SKIPPED';
};

type InstallmentAggregateRow = {
  loan_id: string;
  amount_due: number;
  status: 'PENDING' | 'PAID' | 'LATE' | 'SKIPPED';
};

type PaymentInstallmentRow = {
  installment_id: string | null;
  amount: number;
};

type PaymentAggregateRow = {
  loan_id: string;
  amount: number;
};

type LoanAggregates = {
  totalDue: number;
  paidTotal: number;
  balance: number;
  installmentsPaid: number;
  installmentsPending: number;
  installmentsOverdue: number;
};

const LOAN_SELECT =
  'id,client_id,collector_id,principal,interest_rate,total_due,term_installments,start_date,status,arrears_days,client:clients!loans_client_id_fkey(full_name),collector:users!loans_collector_id_fkey(full_name)';

function getRelationName(value: LoanRow['client'] | LoanRow['collector']) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0]?.full_name;
  return value.full_name;
}

function toPortfolioStatus(status: LoanStatus, arrearsDays: number): PortfolioStatus {
  if (status === 'WRITEOFF') return 'castigo';
  if (status === 'IN_COLLECTION') return 'riesgo';
  if (status === 'IN_ARREARS') return arrearsDays > 30 ? 'moroso' : 'riesgo';
  return 'al_dia';
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatIn(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

function buildFallbackAggregate(row: LoanRow): LoanAggregates {
  const totalDue = Number(row.total_due ?? 0);
  const installmentsPaid = row.status === 'PAID' ? Number(row.term_installments ?? 0) : 0;
  const installmentsPending = Math.max(Number(row.term_installments ?? 0) - installmentsPaid, 0);

  return {
    totalDue: roundMoney(totalDue),
    paidTotal: 0,
    balance: roundMoney(totalDue),
    installmentsPaid,
    installmentsPending,
    installmentsOverdue: row.status === 'IN_ARREARS' || row.status === 'IN_COLLECTION' ? installmentsPending : 0,
  };
}

function mapLoan(row: LoanRow, aggregate?: LoanAggregates): Loan {
  const safeAggregate = aggregate ?? buildFallbackAggregate(row);

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: getRelationName(row.client),
    principal: Number(row.principal ?? 0),
    interest: Number((Number(row.interest_rate ?? 0) * 100).toFixed(2)),
    installments: Number(row.term_installments ?? 0),
    startDate: row.start_date,
    collectorId: row.collector_id,
    collectorName: getRelationName(row.collector),
    status: toPortfolioStatus(row.status, Number(row.arrears_days ?? 0)),
    totalDue: safeAggregate.totalDue,
    paidTotal: safeAggregate.paidTotal,
    balance: safeAggregate.balance,
    installmentsPaid: safeAggregate.installmentsPaid,
    installmentsPending: safeAggregate.installmentsPending,
    installmentsOverdue: safeAggregate.installmentsOverdue,
  };
}

function addDays(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mapInstallmentStatus(
  status: InstallmentRow['status'],
  dueDate: string
): Installment['status'] {
  if (status === 'PAID') return 'paid';
  if (status === 'LATE') return 'overdue';
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today ? 'overdue' : 'pending';
}

function applyLoanFilters(loans: Loan[], filters: QueryFilters) {
  let result = [...loans];

  if (filters.status) {
    result = result.filter((loan) => loan.status === filters.status);
  }

  if (filters.collector) {
    const collectorFilter = filters.collector.toLowerCase();
    result = result.filter((loan) => loan.collectorName?.toLowerCase().includes(collectorFilter));
  }

  if (filters.search) {
    const search = filters.search.trim().toLowerCase();
    result = result.filter((loan) => {
      if (loan.id.toLowerCase().includes(search)) {
        return true;
      }

      if (loan.clientName?.toLowerCase().includes(search)) {
        return true;
      }

      if (loan.clientId?.toLowerCase().includes(search)) {
        return true;
      }

      return false;
    });
  }

  return result;
}

async function fetchLoanAggregates(loanIds: string[]) {
  if (loanIds.length === 0) {
    return {};
  }

  const inFilter = formatIn(loanIds);

  const [installments, payments] = await Promise.all([
    supabaseRequest<InstallmentAggregateRow[]>(
      '/installments',
      {
        query: {
          select: 'loan_id,amount_due,status',
          loan_id: inFilter,
        },
      },
      'No fue posible consultar cuotas para la cartera.'
    ),
    supabaseRequest<PaymentAggregateRow[]>(
      '/payments',
      {
        query: {
          select: 'loan_id,amount',
          loan_id: inFilter,
        },
      },
      'No fue posible consultar pagos para la cartera.'
    ),
  ]);

  const aggregateMap = loanIds.reduce<Record<string, LoanAggregates>>((acc, loanId) => {
    acc[loanId] = {
      totalDue: 0,
      paidTotal: 0,
      balance: 0,
      installmentsPaid: 0,
      installmentsPending: 0,
      installmentsOverdue: 0,
    };
    return acc;
  }, {});

  installments.forEach((installment) => {
    const current = aggregateMap[installment.loan_id];
    if (!current) {
      return;
    }

    current.totalDue = roundMoney(current.totalDue + Number(installment.amount_due ?? 0));
    if (installment.status === 'PAID') {
      current.installmentsPaid += 1;
      return;
    }

    current.installmentsPending += 1;
    if (installment.status === 'LATE') {
      current.installmentsOverdue += 1;
    }
  });

  payments.forEach((payment) => {
    const current = aggregateMap[payment.loan_id];
    if (!current) {
      return;
    }

    current.paidTotal = roundMoney(current.paidTotal + Number(payment.amount ?? 0));
  });

  Object.values(aggregateMap).forEach((aggregate) => {
    aggregate.balance = roundMoney(Math.max(aggregate.totalDue - aggregate.paidTotal, 0));
  });

  return aggregateMap;
}

export async function getLoans(filters: QueryFilters = {}) {
  const rows = await supabaseRequest<LoanRow[]>(
    '/loans',
    {
      query: {
        select: LOAN_SELECT,
        order: 'created_at.desc',
      },
    },
    'No fue posible cargar prestamos.'
  );

  const loanIds = rows.map((row) => row.id);
  const aggregates = await fetchLoanAggregates(loanIds);
  const loans = rows.map((row) => mapLoan(row, aggregates[row.id]));

  return applyLoanFilters(loans, filters);
}

export async function getLoanById(id: string) {
  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id del prestamo.');
  }

  const rows = await supabaseRequest<LoanRow[]>(
    '/loans',
    {
      query: {
        select: LOAN_SELECT,
        id: `eq.${id}`,
        limit: 1,
      },
    },
    'No fue posible cargar el prestamo.'
  );

  const row = rows[0];
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se encontro el prestamo solicitado.', 404);
  }

  const aggregate = await fetchLoanAggregates([row.id]);
  return mapLoan(row, aggregate[row.id]);
}

export async function getLoanInstallments(id: string) {
  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id del prestamo.');
  }

  const [installments, payments] = await Promise.all([
    supabaseRequest<InstallmentRow[]>(
      '/installments',
      {
        query: {
          select: 'id,due_date,amount_due,status',
          loan_id: `eq.${id}`,
          order: 'installment_number.asc',
        },
      },
      'No fue posible cargar cuotas.'
    ),
    supabaseRequest<PaymentInstallmentRow[]>(
      '/payments',
      {
        query: {
          select: 'installment_id,amount',
          loan_id: `eq.${id}`,
        },
      },
      'No fue posible cargar pagos del prestamo.'
    ),
  ]);

  const paidByInstallment = payments.reduce<Record<string, number>>((acc, payment) => {
    if (!payment.installment_id) {
      return acc;
    }
    acc[payment.installment_id] = (acc[payment.installment_id] ?? 0) + Number(payment.amount ?? 0);
    return acc;
  }, {});

  return installments.map((installment) => ({
    id: installment.id,
    dueDate: installment.due_date,
    amount: Number(installment.amount_due ?? 0),
    paidAmount: Number((paidByInstallment[installment.id] ?? 0).toFixed(2)),
    status: mapInstallmentStatus(installment.status, installment.due_date),
  }));
}

async function getFirstActiveId(table: 'tariffs' | 'late_fee_policies') {
  const rows = await supabaseRequest<{ id: string }[]>(
    `/${table}`,
    {
      query: {
        select: 'id',
        active: 'eq.true',
        order: 'created_at.asc',
        limit: 1,
      },
    },
    `No fue posible consultar ${table}.`
  );

  return rows[0]?.id;
}

export async function createLoan(payload: LoanPayload) {
  const principal = Number(payload.principal);
  const installments = Number(payload.installments);
  const interestRate = Number(payload.interest) / 100;

  if (!payload.clientId?.trim() || !payload.collectorId?.trim()) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id de cliente y cobrador.');
  }

  if (!Number.isFinite(principal) || principal <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'El principal debe ser mayor a cero.');
  }

  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new ApiError('VALIDATION_ERROR', 'El interes debe ser un numero valido.');
  }

  if (!Number.isInteger(installments) || installments <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'Las cuotas deben ser un entero mayor a cero.');
  }

  const [tariffId, lateFeePolicyId] = await Promise.all([
    getFirstActiveId('tariffs'),
    getFirstActiveId('late_fee_policies'),
  ]);

  if (!tariffId || !lateFeePolicyId) {
    throw new ApiError('UNKNOWN', 'No hay tarifa o politica de mora activa para crear el prestamo.');
  }

  const totalDue = roundMoney(principal * (1 + interestRate));

  const inserted = await supabaseRequest<LoanRow[] | LoanRow>(
    '/loans',
    {
      method: 'POST',
      query: { select: LOAN_SELECT },
      body: {
        client_id: payload.clientId.trim(),
        collector_id: payload.collectorId.trim(),
        tariff_id: tariffId,
        late_fee_policy_id: lateFeePolicyId,
        principal,
        interest_rate: roundMoney(interestRate),
        total_due: totalDue,
        term_installments: installments,
        start_date: payload.startDate,
        status: 'ACTIVE',
        arrears_days: 0,
        notes: 'Prestamo creado desde la app',
      },
      preferRepresentation: true,
    },
    'No fue posible crear el prestamo.'
  );

  const loanRow = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!loanRow) {
    throw new ApiError('UNKNOWN', 'No se recibio el prestamo creado.');
  }

  const installmentBase = roundMoney(totalDue / installments);
  const installmentsPayload = Array.from({ length: installments }).map((_, index) => {
    const installmentNumber = index + 1;
    const isLast = installmentNumber === installments;
    const amountDue = isLast
      ? roundMoney(totalDue - installmentBase * (installments - 1))
      : installmentBase;

    return {
      loan_id: loanRow.id,
      installment_number: installmentNumber,
      due_date: addDays(payload.startDate, installmentNumber * 7),
      amount_due: amountDue,
      status: 'PENDING',
    };
  });

  await supabaseRequest(
    '/installments',
    {
      method: 'POST',
      body: installmentsPayload,
    },
    'No fue posible crear las cuotas del prestamo.'
  );

  return mapLoan(loanRow, {
    totalDue,
    paidTotal: 0,
    balance: totalDue,
    installmentsPaid: 0,
    installmentsPending: installments,
    installmentsOverdue: 0,
  });
}
