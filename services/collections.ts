const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type PortfolioStatus = 'al_dia' | 'riesgo' | 'moroso' | 'castigo';

export type Client = {
  id: string;
  uuid?: string;
  document: string;
  name: string;
  contact: string;
  score: number;
  collectorId?: string;
  collectorName?: string;
  portfolioStatus?: PortfolioStatus;
};

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
};

export type Installment = {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'overdue';
};

export type ClientPayload = {
  document: string;
  name: string;
  contact: string;
  score: number;
};

export type LoanPayload = {
  principal: number;
  interest: number;
  installments: number;
  startDate: string;
  collectorId: string;
  clientId?: string;
};

export type PaymentPayload = {
  amount: number;
  method: string;
  client_payment_uuid: string;
  evidence?: string;
};

export class CollectionsApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

type QueryFilters = {
  status?: string;
  collector?: string;
};

function toQueryString(filters: QueryFilters): string {
  const query = new URLSearchParams();

  if (filters.status) {
    query.set('status', filters.status);
  }

  if (filters.collector) {
    query.set('collector', filters.collector);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CollectionsApiError(
      (body?.message as string | undefined) ?? 'No fue posible completar la operación.',
      response.status
    );
  }

  return body as T;
}

function getHeaders(accessToken?: string, contentType = true): Record<string, string> {
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function getClients(accessToken?: string, filters: QueryFilters = {}): Promise<Client[]> {
  const response = await fetch(`${API_BASE_URL}/clients${toQueryString(filters)}`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<Client[]>(response);
}

export async function getClientById(id: string, accessToken?: string): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<Client>(response);
}

export async function createClient(payload: ClientPayload, accessToken?: string): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<Client>(response);
}

export async function getLoans(accessToken?: string, filters: QueryFilters = {}): Promise<Loan[]> {
  const response = await fetch(`${API_BASE_URL}/loans${toQueryString(filters)}`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<Loan[]>(response);
}

export async function getLoanById(id: string, accessToken?: string): Promise<Loan> {
  const response = await fetch(`${API_BASE_URL}/loans/${id}`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<Loan>(response);
}

export async function getLoanInstallments(id: string, accessToken?: string): Promise<Installment[]> {
  const response = await fetch(`${API_BASE_URL}/loans/${id}/installments`, {
    headers: getHeaders(accessToken),
  });

  return parseResponse<Installment[]>(response);
}

export async function createLoan(payload: LoanPayload, accessToken?: string): Promise<Loan> {
  const response = await fetch(`${API_BASE_URL}/loans`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<Loan>(response);
}

export async function createPayment(payload: PaymentPayload, accessToken?: string): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  return parseResponse<{ id: string }>(response);
}
