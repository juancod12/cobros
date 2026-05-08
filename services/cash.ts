import { supabaseRequest } from '@/services/http';
import { getAuthSession } from '@/store/auth-store';
import { ApiError } from '@/types/api-error';

export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'AUTO_CLOSED';
export type MovementType = 'IN' | 'OUT' | 'ADJUST';

export type CashMovement = {
  id: string;
  type: MovementType;
  amount: number;
  note?: string;
  createdAt?: string;
};

export type CashExpense = {
  id: string;
  category: string;
  amount: number;
  note?: string;
  createdAt?: string;
};

export type CashSession = {
  id: string;
  collectorId?: string;
  status: CashSessionStatus;
  openingBalance: number;
  totalIncome: number;
  totalOutflow: number;
  totalExpenses: number;
  expectedBalance: number;
  closedBalance?: number;
  openedAt?: string;
  closedAt?: string;
  movements?: CashMovement[];
  expenses?: CashExpense[];
};

type CashSessionRow = {
  id: string;
  collector_id: string;
  status: CashSessionStatus;
  opening_balance: number;
  closing_balance: number | null;
  opened_at: string;
  closed_at: string | null;
};

type CashMovementRow = {
  id: string;
  type: MovementType;
  amount: number;
  concept: string;
  created_at: string;
};

type CashExpenseRow = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
};

const CASH_SESSION_SELECT =
  'id,collector_id,status,opening_balance,closing_balance,opened_at,closed_at';

function mapMovement(row: CashMovementRow): CashMovement {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount ?? 0),
    note: row.concept,
    createdAt: row.created_at,
  };
}

function mapExpense(row: CashExpenseRow): CashExpense {
  return {
    id: row.id,
    category: row.category,
    amount: Number(row.amount ?? 0),
    note: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

function calculateTotals(movements: CashMovement[], expenses: CashExpense[]) {
  const totals = {
    income: 0,
    outflow: 0,
  };

  movements.forEach((movement) => {
    if (movement.type === 'IN') {
      totals.income += movement.amount;
      return;
    }

    if (movement.type === 'OUT') {
      totals.outflow += movement.amount;
      return;
    }

    if (movement.amount >= 0) {
      totals.income += movement.amount;
    } else {
      totals.outflow += Math.abs(movement.amount);
    }
  });

  const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  return {
    totalIncome: Number(totals.income.toFixed(2)),
    totalOutflow: Number(totals.outflow.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
  };
}

function mapCashSession(row: CashSessionRow, movements: CashMovement[], expenses: CashExpense[]): CashSession {
  const totals = calculateTotals(movements, expenses);
  const expectedBalance = Number(
    (Number(row.opening_balance ?? 0) + totals.totalIncome - totals.totalOutflow - totals.totalExpenses).toFixed(2)
  );

  return {
    id: row.id,
    collectorId: row.collector_id,
    status: row.status,
    openingBalance: Number(row.opening_balance ?? 0),
    totalIncome: totals.totalIncome,
    totalOutflow: totals.totalOutflow,
    totalExpenses: totals.totalExpenses,
    expectedBalance,
    closedBalance: row.closing_balance ?? undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    movements,
    expenses,
  };
}

export async function openCashSession(payload: { collectorId: string; openingBalance: number }) {
  const collectorId = payload.collectorId.trim() || getAuthSession()?.user.id;
  if (!collectorId) {
    throw new ApiError('VALIDATION_ERROR', 'No se encontró un cobrador válido para abrir caja.');
  }

  if (!Number.isFinite(payload.openingBalance) || payload.openingBalance < 0) {
    throw new ApiError('VALIDATION_ERROR', 'El saldo inicial debe ser mayor o igual a cero.');
  }

  const existingOpen = await supabaseRequest<CashSessionRow[]>(
    '/cash_sessions',
    {
      query: {
        select: CASH_SESSION_SELECT,
        collector_id: `eq.${collectorId}`,
        status: 'eq.OPEN',
        order: 'opened_at.desc',
        limit: 1,
      },
    },
    'No fue posible validar la caja abierta.'
  );

  if (existingOpen[0]) {
    return getCashSession(existingOpen[0].id);
  }

  const inserted = await supabaseRequest<CashSessionRow[] | CashSessionRow>(
    '/cash_sessions',
    {
      method: 'POST',
      query: { select: CASH_SESSION_SELECT },
      body: {
        collector_id: collectorId,
        opened_at: new Date().toISOString(),
        opening_balance: Number(payload.openingBalance),
        status: 'OPEN',
      },
      preferRepresentation: true,
    },
    'No fue posible abrir la sesión de caja.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row?.id) {
    throw new ApiError('UNKNOWN', 'No se recibió la sesión de caja creada.');
  }

  return getCashSession(row.id);
}

export async function getCashSession(id: string) {
  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id de la sesión de caja.');
  }

  const [sessions, movementRows, expenseRows] = await Promise.all([
    supabaseRequest<CashSessionRow[]>(
      '/cash_sessions',
      {
        query: {
          select: CASH_SESSION_SELECT,
          id: `eq.${id}`,
          limit: 1,
        },
      },
      'No fue posible cargar la sesión de caja.'
    ),
    supabaseRequest<CashMovementRow[]>(
      '/cash_movements',
      {
        query: {
          select: 'id,type,amount,concept,created_at',
          cash_session_id: `eq.${id}`,
          order: 'created_at.desc',
        },
      },
      'No fue posible cargar movimientos de caja.'
    ),
    supabaseRequest<CashExpenseRow[]>(
      '/collector_expenses',
      {
        query: {
          select: 'id,category,amount,description,created_at',
          cash_session_id: `eq.${id}`,
          order: 'created_at.desc',
        },
      },
      'No fue posible cargar gastos de caja.'
    ),
  ]);

  const sessionRow = sessions[0];
  if (!sessionRow) {
    throw new ApiError('UNKNOWN', 'No se encontró la sesión de caja solicitada.', 404);
  }

  const movements = movementRows.map(mapMovement);
  const expenses = expenseRows.map(mapExpense);

  return mapCashSession(sessionRow, movements, expenses);
}

export async function registerCashMovement(
  sessionId: string,
  payload: { type: MovementType; amount: number; note?: string }
) {
  const currentUserId = getAuthSession()?.user.id;
  if (!currentUserId) {
    throw new ApiError('UNAUTHORIZED', 'No hay sesión activa para registrar el movimiento.');
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'El monto del movimiento debe ser mayor a cero.');
  }

  const inserted = await supabaseRequest<CashMovementRow[] | CashMovementRow>(
    '/cash_movements',
    {
      method: 'POST',
      query: { select: 'id,type,amount,concept,created_at' },
      body: {
        cash_session_id: sessionId,
        type: payload.type,
        amount: Number(payload.amount),
        concept: payload.note?.trim() || 'Movimiento de caja',
        created_by: currentUserId,
      },
      preferRepresentation: true,
    },
    'No fue posible registrar el movimiento de caja.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibió el movimiento creado.');
  }

  return mapMovement(row);
}

export async function registerCashExpense(
  sessionId: string,
  payload: { category: string; amount: number; note?: string }
) {
  const currentUserId = getAuthSession()?.user.id;
  if (!currentUserId) {
    throw new ApiError('UNAUTHORIZED', 'No hay sesión activa para registrar el gasto.');
  }

  if (!payload.category.trim()) {
    throw new ApiError('VALIDATION_ERROR', 'La categoría del gasto es obligatoria.');
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new ApiError('VALIDATION_ERROR', 'El monto del gasto debe ser mayor a cero.');
  }

  const inserted = await supabaseRequest<CashExpenseRow[] | CashExpenseRow>(
    '/collector_expenses',
    {
      method: 'POST',
      query: { select: 'id,category,amount,description,created_at' },
      body: {
        cash_session_id: sessionId,
        category: payload.category.trim(),
        amount: Number(payload.amount),
        description: payload.note?.trim() || null,
        created_by: currentUserId,
      },
      preferRepresentation: true,
    },
    'No fue posible registrar el gasto de caja.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibió el gasto creado.');
  }

  return mapExpense(row);
}

export async function closeCashSession(sessionId: string, payload: { closingBalance: number; note?: string }) {
  if (!Number.isFinite(payload.closingBalance) || payload.closingBalance < 0) {
    throw new ApiError('VALIDATION_ERROR', 'El saldo de cierre debe ser mayor o igual a cero.');
  }

  await supabaseRequest(
    '/cash_sessions',
    {
      method: 'PATCH',
      query: {
        id: `eq.${sessionId}`,
      },
      body: {
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closing_balance: Number(payload.closingBalance),
        notes: payload.note?.trim() || null,
      },
    },
    'No fue posible cerrar la sesión de caja.'
  );

  return getCashSession(sessionId);
}
