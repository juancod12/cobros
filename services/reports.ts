import { supabaseRequest } from '@/services/http';
import { ApiError } from '@/types/api-error';

export type DashboardFilters = {
  date?: string;
  collector?: string;
  status?: string;
};

export type ReportExportFilters = {
  collector?: string;
  from?: string;
  to?: string;
  format?: 'pdf' | 'xlsx';
};

export type ReportExportResult = {
  status: string;
  message: string;
  downloadUrl?: string;
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

type CollectorRow = {
  user_id: string;
  role?: { code?: string } | { code?: string }[] | null;
  user?: { id: string; full_name: string; status: string } | { id: string; full_name: string; status: string }[] | null;
};

type Collector = {
  id: string;
  name: string;
};

type PaymentRow = {
  id: string;
  collector_id: string;
  loan_id: string;
  amount: number;
  method: string;
  paid_at: string;
};

type LoanRow = {
  id: string;
  collector_id: string;
  status: 'ACTIVE' | 'PAID' | 'IN_ARREARS' | 'IN_COLLECTION' | 'WRITEOFF';
  arrears_days: number;
  total_due: number;
  start_date: string;
  principal: number;
  client?: { full_name: string } | { full_name: string }[] | null;
};

type ExpenseRow = {
  amount: number;
};

type CashSessionRow = {
  id: string;
  collector_id: string;
  status: 'OPEN' | 'CLOSED' | 'AUTO_CLOSED';
  opened_at: string;
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getRelationItem<T extends object>(value: T | T[] | null | undefined) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toCsvDataUrl(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return 'data:text/csv;charset=utf-8,Sin%20registros';
  }

  const columns = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const normalized = value === null || value === undefined ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeValue(row[column])).join(',')),
  ];

  return `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
}

function toXlsxDataUrl(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return 'data:application/vnd.ms-excel;charset=utf-8,Sin%20registros';
  }

  const columns = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const normalized = value === null || value === undefined ? '' : String(value);
    return normalized.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  };

  const lines = [
    columns.join('\t'),
    ...rows.map((row) => columns.map((column) => escapeValue(row[column])).join('\t')),
  ];

  return `data:application/vnd.ms-excel;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
}

function toPdfTextDataUrl(title: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return `data:application/pdf;charset=utf-8,${encodeURIComponent(`${title}\n\nSin registros`)}`;
  }

  const columns = Object.keys(rows[0]);
  const printableRows = rows.map((row) =>
    columns.map((column) => `${column}: ${row[column] === null || row[column] === undefined ? '' : String(row[column])}`).join(' | ')
  );
  const content = [title, '', ...printableRows].join('\n');

  return `data:application/pdf;charset=utf-8,${encodeURIComponent(content)}`;
}

function toExportDataUrl(
  rows: Record<string, unknown>[],
  format: ReportExportFilters['format'],
  title: string
) {
  if (format === 'xlsx') {
    return toXlsxDataUrl(rows);
  }

  if (format === 'pdf') {
    return toPdfTextDataUrl(title, rows);
  }

  return toCsvDataUrl(rows);
}

function toStartOfDay(date: string) {
  return `${date}T00:00:00.000Z`;
}

function toEndExclusive(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

function resolveDateRange(date?: string, from?: string, to?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = (from && ISO_DATE_REGEX.test(from) ? from : date) || today;
  const toDate = (to && ISO_DATE_REGEX.test(to) ? to : date) || fromDate;

  return {
    fromDate,
    toDate,
    fromIso: toStartOfDay(fromDate),
    toIsoExclusive: toEndExclusive(toDate),
  };
}

function normalizeCollectors(rows: CollectorRow[]) {
  return rows
    .map((row) => {
      const role = getRelationItem(row.role);
      const user = getRelationItem(row.user);

      if (!user || role?.code !== 'COLLECTOR') {
        return null;
      }

      return { id: user.id, name: user.full_name } satisfies Collector;
    })
    .filter((collector): collector is Collector => Boolean(collector));
}

function formatIn(ids: string[]) {
  return `in.(${ids.join(',')})`;
}

async function fetchCollectors(nameFilter?: string) {
  const rows = await supabaseRequest<CollectorRow[]>(
    '/user_roles',
    {
      query: {
        select:
          'user_id,role:roles!user_roles_role_id_fkey(code),user:users!user_roles_user_id_fkey(id,full_name,status)',
        'role.code': 'eq.COLLECTOR',
      },
    },
    'No fue posible consultar cobradores.'
  );

  let collectors = normalizeCollectors(rows);
  if (nameFilter) {
    const normalized = nameFilter.toLowerCase();
    collectors = collectors.filter((collector) => collector.name.toLowerCase().includes(normalized));
  }

  return collectors;
}

export async function getDashboardSummary(filters: DashboardFilters = {}): Promise<DashboardSummary> {
  const { fromIso, toIsoExclusive } = resolveDateRange(filters.date);
  const collectors = await fetchCollectors(filters.collector);
  const collectorIds = collectors.map((collector) => collector.id);

  if (collectorIds.length === 0) {
    return {
      kpis: {
        collectionsToday: 0,
        activePortfolio: 0,
        delinquent: 0,
        chargedOff: 0,
        expensesToday: 0,
      },
      alerts: {
        inactivity: [],
        criticalDelinquency: [],
        unclosedSessions: [],
      },
      collectors: [],
    };
  }

  const collectorFilter = formatIn(collectorIds);

  const [payments, loans, expenses, openSessions] = await Promise.all([
    supabaseRequest<PaymentRow[]>(
      '/payments',
      {
        query: {
          select: 'id,collector_id,loan_id,amount,method,paid_at',
          collector_id: collectorFilter,
          and: `(paid_at.gte.${fromIso},paid_at.lt.${toIsoExclusive})`,
        },
      },
      'No fue posible consultar pagos para el dashboard.'
    ),
    supabaseRequest<LoanRow[]>(
      '/loans',
      {
        query: {
          select:
            'id,collector_id,status,arrears_days,total_due,start_date,principal,client:clients!loans_client_id_fkey(full_name)',
          collector_id: collectorFilter,
        },
      },
      'No fue posible consultar prestamos para el dashboard.'
    ),
    supabaseRequest<ExpenseRow[]>(
      '/collector_expenses',
      {
        query: {
          select: 'amount',
          created_by: collectorFilter,
          and: `(created_at.gte.${fromIso},created_at.lt.${toIsoExclusive})`,
        },
      },
      'No fue posible consultar gastos para el dashboard.'
    ),
    supabaseRequest<CashSessionRow[]>(
      '/cash_sessions',
      {
        query: {
          select: 'id,collector_id,status,opened_at',
          collector_id: collectorFilter,
          status: 'eq.OPEN',
          order: 'opened_at.desc',
        },
      },
      'No fue posible consultar sesiones de caja.'
    ),
  ]);

  const collectionsToday = payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
  const expensesToday = expenses.reduce((acc, expense) => acc + toNumber(expense.amount), 0);

  const activePortfolio = loans
    .filter((loan) => loan.status === 'ACTIVE' || loan.status === 'IN_ARREARS' || loan.status === 'IN_COLLECTION')
    .reduce((acc, loan) => acc + toNumber(loan.total_due), 0);
  const delinquent = loans.filter((loan) => loan.status === 'IN_ARREARS' || loan.status === 'IN_COLLECTION').length;
  const chargedOff = loans.filter((loan) => loan.status === 'WRITEOFF').length;

  const paymentByCollector = new Set(payments.map((payment) => payment.collector_id));
  const inactivity = collectors
    .filter((collector) => !paymentByCollector.has(collector.id))
    .map((collector) => ({
      id: collector.id,
      label: collector.name,
      detail: 'Sin pagos registrados en el rango seleccionado.',
    }));

  const criticalDelinquency = loans
    .filter((loan) => loan.arrears_days > 15 || loan.status === 'WRITEOFF')
    .map((loan) => ({
      id: loan.id,
      label: getRelationItem(loan.client)?.full_name ?? `Prestamo ${loan.id.slice(0, 8)}`,
      detail: loan.status === 'WRITEOFF' ? 'En castigo' : `${loan.arrears_days} dias de mora`,
    }));

  const collectorById = new Map(collectors.map((collector) => [collector.id, collector.name]));
  const unclosedSessions = openSessions.map((session) => ({
    id: session.id,
    label: collectorById.get(session.collector_id) ?? `Cobrador ${session.collector_id.slice(0, 8)}`,
    detail: `Caja abierta desde ${new Date(session.opened_at).toLocaleString('es-CO')}`,
  }));

  return {
    kpis: {
      collectionsToday: Number(collectionsToday.toFixed(2)),
      activePortfolio: Number(activePortfolio.toFixed(2)),
      delinquent,
      chargedOff,
      expensesToday: Number(expensesToday.toFixed(2)),
    },
    alerts: {
      inactivity,
      criticalDelinquency,
      unclosedSessions,
    },
    collectors: collectors.map((collector) => collector.name),
  };
}

async function fetchReportPayments(filters: ReportExportFilters) {
  const { fromIso, toIsoExclusive } = resolveDateRange(undefined, filters.from, filters.to);
  const collectors = await fetchCollectors(filters.collector);
  const collectorIds = collectors.map((collector) => collector.id);

  if (collectorIds.length === 0) {
    return [];
  }

  return supabaseRequest<PaymentRow[]>(
    '/payments',
    {
      query: {
        select: 'id,collector_id,loan_id,amount,method,paid_at',
        collector_id: formatIn(collectorIds),
        and: `(paid_at.gte.${fromIso},paid_at.lt.${toIsoExclusive})`,
        order: 'paid_at.desc',
      },
    },
    'No fue posible consultar pagos para el reporte.'
  );
}

async function fetchReportLoans(filters: ReportExportFilters) {
  const collectors = await fetchCollectors(filters.collector);
  const collectorIds = collectors.map((collector) => collector.id);

  if (collectorIds.length === 0) {
    return [];
  }

  return supabaseRequest<LoanRow[]>(
    '/loans',
    {
      query: {
        select:
          'id,collector_id,status,arrears_days,total_due,start_date,principal,client:clients!loans_client_id_fkey(full_name)',
        collector_id: formatIn(collectorIds),
        order: 'created_at.desc',
      },
    },
    'No fue posible consultar prestamos para el reporte.'
  );
}

export async function exportDailyReport(filters: ReportExportFilters): Promise<ReportExportResult> {
  const rows = await fetchReportPayments(filters);
  const format = filters.format ?? 'pdf';

  const methodTotals = rows.reduce<Record<string, number>>((acc, payment) => {
    const method = payment.method || 'OTHER';
    acc[method] = (acc[method] ?? 0) + toNumber(payment.amount);
    return acc;
  }, {});

  const summaryRows = Object.entries(methodTotals).map(([method, total]) => ({
    seccion: 'resumen_metodo',
    metodo: method,
    total_metodo: total.toFixed(2),
    conteo_pagos: rows.filter((payment) => payment.method === method).length,
  }));

  const detailRows = rows.map((row) => ({
    seccion: 'detalle_pago',
    pago_id: row.id,
    collector_id: row.collector_id,
    prestamo_id: row.loan_id,
    metodo: row.method,
    monto: toNumber(row.amount).toFixed(2),
    fecha_pago: row.paid_at,
  }));

  const downloadRows = [...summaryRows, ...detailRows];
  const title = `Reporte diario ${filters.from ?? ''} - ${filters.to ?? ''}`.trim();

  return {
    status: 'ok',
    message: `Reporte diario generado con ${rows.length} registros.`,
    downloadUrl: toExportDataUrl(downloadRows, format, title),
  };
}

export async function exportLoansReport(filters: ReportExportFilters): Promise<ReportExportResult> {
  const rows = await fetchReportLoans(filters);
  const format = filters.format ?? 'pdf';

  const downloadRows = rows.map((row) => ({
    prestamo_id: row.id,
    cliente: getRelationItem(row.client)?.full_name ?? '',
    collector_id: row.collector_id,
    principal: toNumber(row.principal).toFixed(2),
    total_deuda: toNumber(row.total_due).toFixed(2),
    estado: row.status,
    dias_mora: row.arrears_days,
    fecha_inicio: row.start_date,
  }));
  const title = `Reporte cartera ${filters.from ?? ''} - ${filters.to ?? ''}`.trim();

  return {
    status: 'ok',
    message: `Reporte de prestamos generado con ${rows.length} registros.`,
    downloadUrl: toExportDataUrl(downloadRows, format, title),
  };
}
