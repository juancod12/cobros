import { supabaseRequest } from '@/services/http';
import { getAuthSession } from '@/store/auth-store';

export type HomeUnitRow = {
  id: string;
  unit: string;
  cn: string;
  location: string;
  status: 'Abierta' | 'Cerrada';
  score: string;
  cashBox: string;
  cashDate: string;
  initialCash: number;
  finalCash: number;
  progress: string;
  lastSync: string;
  pinVersion: string;
};

export type HomeOverview = {
  companies: string[];
  rows: HomeUnitRow[];
  unreadNotifications: number;
};

type CollectorRow = {
  user_id: string;
  role?: { code?: string } | { code?: string }[] | null;
  user?:
    | { id: string; full_name: string; cc: string | null; status: string }
    | { id: string; full_name: string; cc: string | null; status: string }[]
    | null;
};

type Collector = {
  id: string;
  name: string;
  cc: string;
};

type CashSessionRow = {
  id: string;
  collector_id: string;
  status: 'OPEN' | 'CLOSED' | 'AUTO_CLOSED';
  opened_at: string;
  closing_balance: number | null;
  opening_balance: number;
  updated_at: string;
};

type PaymentRow = {
  collector_id: string;
  paid_at: string;
};

type LoanRow = {
  collector_id: string;
  status: 'ACTIVE' | 'PAID' | 'IN_ARREARS' | 'IN_COLLECTION' | 'WRITEOFF';
  arrears_days: number;
};

type ClientRow = {
  assigned_collector_id: string | null;
  score: number | null;
  address: string | null;
};

function getRelationItem<T extends object>(value: T | T[] | null | undefined) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatIn(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

function formatCashDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeCollectors(rows: CollectorRow[]) {
  return rows
    .map((row) => {
      const role = getRelationItem(row.role);
      const user = getRelationItem(row.user);
      if (!user || role?.code !== 'COLLECTOR') {
        return null;
      }
      return {
        id: user.id,
        name: user.full_name,
        cc: user.cc ?? '-',
      } satisfies Collector;
    })
    .filter((collector): collector is Collector => Boolean(collector));
}

function getLatestByCollector<T extends { collector_id: string; opened_at?: string; paid_at?: string }>(
  rows: T[],
  field: 'opened_at' | 'paid_at'
) {
  const result = new Map<string, T>();

  rows.forEach((row) => {
    const current = result.get(row.collector_id);
    const currentDate = current ? new Date(String(current[field] ?? '')).getTime() : 0;
    const rowDate = new Date(String(row[field] ?? '')).getTime();
    if (!current || rowDate > currentDate) {
      result.set(row.collector_id, row);
    }
  });

  return result;
}

export async function getHomeOverview(): Promise<HomeOverview> {
  const authSession = getAuthSession();

  const [settingsRows, collectorRows, unreadRows] = await Promise.all([
    supabaseRequest<{ business_timezone: string }[]>(
      '/system_settings',
      {
        query: { select: 'business_timezone', limit: 1 },
      },
      'No fue posible consultar configuración del sistema.'
    ),
    supabaseRequest<CollectorRow[]>(
      '/user_roles',
      {
        query: {
          select:
            'user_id,role:roles!user_roles_role_id_fkey(code),user:users!user_roles_user_id_fkey(id,full_name,cc,status)',
          'role.code': 'eq.COLLECTOR',
        },
      },
      'No fue posible consultar cobradores.'
    ),
    authSession?.user.id
      ? supabaseRequest<{ id: string }[]>(
          '/notifications',
          {
            query: {
              select: 'id',
              user_id: `eq.${authSession.user.id}`,
              status: 'neq.READ',
            },
          },
          'No fue posible consultar notificaciones.'
        )
      : Promise.resolve([]),
  ]);

  const collectors = normalizeCollectors(collectorRows);
  const collectorIds = collectors.map((collector) => collector.id);

  if (collectorIds.length === 0) {
    const timezone = settingsRows[0]?.business_timezone ?? 'America/Bogota';
    return {
      companies: [`Operacion (${timezone})`],
      rows: [],
      unreadNotifications: unreadRows.length,
    };
  }

  const inFilter = formatIn(collectorIds);

  const [sessions, payments, loans, clients] = await Promise.all([
    supabaseRequest<CashSessionRow[]>(
      '/cash_sessions',
      {
        query: {
          select: 'id,collector_id,status,opened_at,closing_balance,opening_balance,updated_at',
          collector_id: inFilter,
          order: 'opened_at.desc',
        },
      },
      'No fue posible consultar sesiones de caja.'
    ),
    supabaseRequest<PaymentRow[]>(
      '/payments',
      {
        query: {
          select: 'collector_id,paid_at',
          collector_id: inFilter,
          order: 'paid_at.desc',
        },
      },
      'No fue posible consultar pagos.'
    ),
    supabaseRequest<LoanRow[]>(
      '/loans',
      {
        query: {
          select: 'collector_id,status,arrears_days',
          collector_id: inFilter,
        },
      },
      'No fue posible consultar prestamos.'
    ),
    supabaseRequest<ClientRow[]>(
      '/clients',
      {
        query: {
          select: 'assigned_collector_id,score,address',
          assigned_collector_id: inFilter,
        },
      },
      'No fue posible consultar clientes.'
    ),
  ]);

  const latestSessionByCollector = getLatestByCollector(sessions, 'opened_at');
  const latestPaymentByCollector = getLatestByCollector(payments, 'paid_at');

  const rows = collectors.map((collector, index) => {
    const collectorSessions = sessions.filter((session) => session.collector_id === collector.id);
    const collectorLoans = loans.filter((loan) => loan.collector_id === collector.id);
    const collectorClients = clients.filter((client) => client.assigned_collector_id === collector.id);

    const latestSession = latestSessionByCollector.get(collector.id);
    const latestPayment = latestPaymentByCollector.get(collector.id);

    const avgScore =
      collectorClients.length > 0
        ? collectorClients.reduce((acc, client) => acc + toNumber(client.score), 0) / collectorClients.length
        : null;
    const location = collectorClients.find((client) => client.address)?.address ?? 'Sin ubicacion';

    const healthyLoans = collectorLoans.filter(
      (loan) =>
        loan.status === 'ACTIVE' ||
        loan.status === 'PAID' ||
        (loan.status === 'IN_ARREARS' && toNumber(loan.arrears_days) <= 0)
    ).length;
    const progress = collectorLoans.length
      ? `${Math.round((healthyLoans / collectorLoans.length) * 100)}%`
      : '0%';

    const status: HomeUnitRow['status'] = latestSession?.status === 'OPEN' ? 'Abierta' : 'Cerrada';
    const lastSyncSource = latestPayment?.paid_at ?? latestSession?.updated_at ?? null;

    return {
      id: collector.id,
      unit: `${index + 1} - ${collector.name}`,
      cn: collector.cc || '-',
      location,
      status,
      score: avgScore !== null ? String(Math.round(avgScore)) : 'N/A',
      cashBox: latestSession ? latestSession.id.slice(0, 8) : '-',
      cashDate: formatCashDate(latestSession?.opened_at),
      initialCash: toNumber(latestSession?.opening_balance),
      finalCash: toNumber(latestSession?.closing_balance),
      progress,
      lastSync: formatDateTime(lastSyncSource),
      pinVersion: 'Pin: - / Version: -',
    };
  });

  const timezone = settingsRows[0]?.business_timezone ?? 'America/Bogota';

  return {
    companies: [`Operacion (${timezone})`],
    rows,
    unreadNotifications: unreadRows.length,
  };
}
