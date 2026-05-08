const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

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

export class CashSessionApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

function getHeaders(accessToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CashSessionApiError(
      (body?.message as string | undefined) ?? 'No fue posible completar la operación de caja.',
      response.status
    );
  }

  return body as T;
}

export async function openCashSession(
  payload: { collectorId: string; openingBalance: number },
  accessToken?: string
): Promise<CashSession> {
  const response = await fetch(`${API_BASE_URL}/cash-sessions/open`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<CashSession>(response);
}

export async function getCashSession(id: string, accessToken?: string): Promise<CashSession> {
  const response = await fetch(`${API_BASE_URL}/cash-sessions/${id}`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<CashSession>(response);
}

export async function registerCashMovement(
  sessionId: string,
  payload: { type: MovementType; amount: number; note?: string },
  accessToken?: string
): Promise<CashMovement> {
  const response = await fetch(`${API_BASE_URL}/cash-sessions/${sessionId}/movements`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<CashMovement>(response);
}

export async function registerCashExpense(
  sessionId: string,
  payload: { category: string; amount: number; note?: string },
  accessToken?: string
): Promise<CashExpense> {
  const response = await fetch(`${API_BASE_URL}/cash-sessions/${sessionId}/expenses`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<CashExpense>(response);
}

export async function closeCashSession(
  sessionId: string,
  payload: { closingBalance: number; note?: string },
  accessToken?: string
): Promise<CashSession> {
  const response = await fetch(`${API_BASE_URL}/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<CashSession>(response);
}
