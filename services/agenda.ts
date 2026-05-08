/**
 * Servicio de Agenda diaria del cobrador.
 * Construye la lista de cobros del día cruzando préstamos + cuotas + pagos.
 */
import { supabaseRequest } from "@/services/http";
import { ApiError } from "@/types/api-error";

export type AgendaStatus = "pending" | "paid" | "overdue" | "partial";

export type AgendaItem = {
  id: string; // installment id
  clientId: string;
  clientName: string;
  clientPhone?: string;
  address?: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  paidAmount: number;
  balance: number;
  status: AgendaStatus;
  daysOverdue: number;
};

// ─── Raw rows ──────────────────────────────────────────────────────────────

type InstallmentRow = {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  status: string;
  loan: {
    id: string;
    collector_id: string;
    client?: {
      id: string;
      full_name: string;
      phone: string | null;
      address: string | null;
    } | null;
  } | null;
};

type PaymentAgg = {
  installment_id: string;
  amount: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function calcDaysOverdue(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return Math.max(diff, 0);
}

function resolveStatus(
  installmentStatus: string,
  paidAmount: number,
  amountDue: number,
  daysOverdue: number,
): AgendaStatus {
  if (installmentStatus === "PAID" || paidAmount >= amountDue - 0.01)
    return "paid";
  if (paidAmount > 0) return "partial";
  if (daysOverdue > 0) return "overdue";
  return "pending";
}

function toItem(row: InstallmentRow, paidAmount: number): AgendaItem {
  const client = row.loan?.client;
  const daysOverdue = calcDaysOverdue(row.due_date);
  const amountDue = Number(row.amount_due ?? 0);
  const paid = Math.round(paidAmount * 100) / 100;

  return {
    id: row.id,
    clientId: client?.id ?? "",
    clientName: client?.full_name ?? "Cliente desconocido",
    clientPhone: client?.phone ?? undefined,
    address: client?.address ?? undefined,
    loanId: row.loan_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    amountDue,
    paidAmount: paid,
    balance: Math.max(amountDue - paid, 0),
    status: resolveStatus(row.status, paid, amountDue, daysOverdue),
    daysOverdue,
  };
}

// ─── Queries ───────────────────────────────────────────────────────────────

/**
 * Agenda del día: cuotas con vencimiento hoy + cuotas vencidas no pagadas.
 */
export async function getTodayAgenda(
  collectorId: string,
): Promise<AgendaItem[]> {
  if (!collectorId)
    throw new ApiError("VALIDATION_ERROR", "Se requiere el id del cobrador.");

  const today = new Date().toISOString().slice(0, 10);

  // Cuotas de hoy + vencidas pendientes
  const rows = await supabaseRequest<InstallmentRow[]>(
    "/installments",
    {
      query: {
        select: [
          "id",
          "loan_id",
          "installment_number",
          "due_date",
          "amount_due",
          "status",
          "loan:loans!installments_loan_id_fkey(id,collector_id,client:clients!loans_client_id_fkey(id,full_name,phone,address))",
        ].join(","),
        "loan.collector_id": `eq.${collectorId}`,
        status: "in.(PENDING,LATE)",
        due_date: `lte.${today}`,
        order: "due_date.asc",
      },
    },
    "No se pudo cargar la agenda del día.",
  );

  // Filtrar por cobrador (PostgREST no filtra relaciones nested directamente)
  const filtered = rows.filter((r) => r.loan?.collector_id === collectorId);
  if (filtered.length === 0) return [];

  // Pagos de estas cuotas
  const installmentIds = filtered.map((r) => r.id);
  const payments = await supabaseRequest<PaymentAgg[]>(
    "/payments",
    {
      query: {
        select: "installment_id,amount",
        installment_id: `in.(${installmentIds.join(",")})`,
      },
    },
    "No se pudo cargar los pagos de la agenda.",
  );

  const paidByInstallment = payments.reduce<Record<string, number>>(
    (acc, p) => {
      if (!p.installment_id) return acc;
      acc[p.installment_id] =
        (acc[p.installment_id] ?? 0) + Number(p.amount ?? 0);
      return acc;
    },
    {},
  );

  return filtered.map((row) => toItem(row, paidByInstallment[row.id] ?? 0));
}

/**
 * Agenda completa (con filtros opcionales).
 */
export async function getFullAgenda(
  collectorId: string,
  filters: {
    status?: AgendaStatus;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<AgendaItem[]> {
  if (!collectorId)
    throw new ApiError("VALIDATION_ERROR", "Se requiere el id del cobrador.");

  const query: Record<string, string> = {
    select: [
      "id",
      "loan_id",
      "installment_number",
      "due_date",
      "amount_due",
      "status",
      "loan:loans!installments_loan_id_fkey(id,collector_id,client:clients!loans_client_id_fkey(id,full_name,phone,address))",
    ].join(","),
    "loan.collector_id": `eq.${collectorId}`,
    order: "due_date.asc",
  };

  if (filters.dateFrom) query.due_date = `gte.${filters.dateFrom}`;
  if (filters.dateTo) query.due_date = `lte.${filters.dateTo}`;

  const rows = await supabaseRequest<InstallmentRow[]>(
    "/installments",
    { query },
    "No se pudo cargar la agenda.",
  );

  const filtered = rows.filter((r) => r.loan?.collector_id === collectorId);
  if (filtered.length === 0) return [];

  const installmentIds = filtered.map((r) => r.id);
  const payments = await supabaseRequest<PaymentAgg[]>(
    "/payments",
    {
      query: {
        select: "installment_id,amount",
        installment_id: `in.(${installmentIds.join(",")})`,
      },
    },
    "No se pudo cargar pagos.",
  );

  const paidByInstallment = payments.reduce<Record<string, number>>(
    (acc, p) => {
      if (!p.installment_id) return acc;
      acc[p.installment_id] =
        (acc[p.installment_id] ?? 0) + Number(p.amount ?? 0);
      return acc;
    },
    {},
  );

  let items = filtered.map((row) =>
    toItem(row, paidByInstallment[row.id] ?? 0),
  );

  if (filters.status) {
    items = items.filter((i) => i.status === filters.status);
  }

  return items;
}
