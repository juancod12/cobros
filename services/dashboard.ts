const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type DashboardFilters = {
  date?: string;
  collector?: string;
  status?: string;
};

export type DashboardKpis = {
  collectionsToday: number;
  activePortfolio: number;
  delinquent: number;
  chargedOff: number;
  expensesToday: number;
};

export type DashboardAlertItem = {
  id: string;
  label: string;
  detail?: string;
};

export type DashboardAlerts = {
  inactivity: DashboardAlertItem[];
  criticalDelinquency: DashboardAlertItem[];
  unclosedSessions: DashboardAlertItem[];
};

export type DashboardSummary = {
  kpis: DashboardKpis;
  alerts: DashboardAlerts;
  collectors: string[];
};

export class DashboardApiError extends Error {
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

function toQueryString(filters: DashboardFilters): string {
  const query = new URLSearchParams();

  if (filters.date) {
    query.set('date', filters.date);
  }

  if (filters.collector) {
    query.set('collector', filters.collector);
  }

  if (filters.status) {
    query.set('status', filters.status);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new DashboardApiError((body?.message as string | undefined) ?? fallbackMessage, response.status);
  }

  return body as T;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeAlertItem(item: unknown, index: number): DashboardAlertItem {
  if (!item || typeof item !== 'object') {
    return { id: `alert-${index}`, label: 'Sin detalle' };
  }

  const rawItem = item as Record<string, unknown>;

  return {
    id: String(rawItem.id ?? rawItem.uuid ?? `alert-${index}`),
    label: String(rawItem.label ?? rawItem.name ?? rawItem.collectorName ?? rawItem.clientName ?? 'Sin detalle'),
    detail:
      typeof rawItem.detail === 'string'
        ? rawItem.detail
        : typeof rawItem.reason === 'string'
          ? rawItem.reason
          : typeof rawItem.status === 'string'
            ? rawItem.status
            : undefined,
  };
}

function normalizeAlertGroup(group: unknown): DashboardAlertItem[] {
  if (!Array.isArray(group)) {
    return [];
  }

  return group.map((item, index) => normalizeAlertItem(item, index));
}

export async function getDashboardSummary(
  filters: DashboardFilters = {},
  accessToken?: string
): Promise<DashboardSummary> {
  const queryString = toQueryString(filters);

  const [collectionsResponse, cashResponse, reportsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/collections/summary${queryString}`, {
      headers: getHeaders(accessToken),
    }),
    fetch(`${API_BASE_URL}/cash-sessions/daily-report${queryString}`, {
      headers: getHeaders(accessToken),
    }),
    fetch(`${API_BASE_URL}/reports/daily${queryString}`, {
      headers: getHeaders(accessToken),
    }),
  ]);

  const collections = await parseResponse<Record<string, unknown>>(
    collectionsResponse,
    'No fue posible cargar el resumen de cobros.'
  );
  const cashReport = await parseResponse<Record<string, unknown>>(
    cashResponse,
    'No fue posible cargar el reporte de caja diario.'
  );
  const dailyReport = await parseResponse<Record<string, unknown>>(
    reportsResponse,
    'No fue posible cargar las alertas diarias.'
  );

  const rawAlerts = (dailyReport.alerts ?? dailyReport) as Record<string, unknown>;

  const collectorsSource = dailyReport.collectors;
  const collectors = Array.isArray(collectorsSource)
    ? collectorsSource.filter((collector): collector is string => typeof collector === 'string')
    : [];

  return {
    kpis: {
      collectionsToday: toNumber(collections.collectionsToday ?? collections.cobrosDelDia ?? collections.todayCollections),
      activePortfolio: toNumber(collections.activePortfolio ?? collections.carteraActiva),
      delinquent: toNumber(collections.delinquent ?? collections.morosos),
      chargedOff: toNumber(collections.chargedOff ?? collections.castigo),
      expensesToday: toNumber(cashReport.expensesToday ?? cashReport.gastosDelDia ?? cashReport.totalExpenses),
    },
    alerts: {
      inactivity: normalizeAlertGroup(rawAlerts.inactivity ?? rawAlerts.inactividad),
      criticalDelinquency: normalizeAlertGroup(rawAlerts.criticalDelinquency ?? rawAlerts.moraCritica),
      unclosedSessions: normalizeAlertGroup(rawAlerts.unclosedSessions ?? rawAlerts.sesionesSinCerrar),
    },
    collectors,
  };
}
