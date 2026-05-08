/**
 * Resumen diario del cobrador.
 * Centraliza los KPIs de la pantalla home del cobrador.
 */
import { supabaseRequest } from "@/services/http";
import { ApiError } from "@/types/api-error";

export type CollectorDailySummary = {
  collectedToday: number;
  paymentsToday: number;
  pendingToday: number;
  pendingCount: number;
  overdueCount: number;
  goalAmount: number;
  goalPct: number;
};

type PaymentRow = { amount: number; paid_at: string };
type InstallmentRow = {
  id: string;
  amount_due: number;
  status: string;
  due_date: string;
  loan: { collector_id: string } | null;
};

function todayRange() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: `${today}T00:00:00.000Z`,
    to: `${today}T23:59:59.999Z`,
  };
}

export async function getCollectorDailySummary(
  collectorId: string,
): Promise<CollectorDailySummary> {
  if (!collectorId)
    throw new ApiError("VALIDATION_ERROR", "Se requiere el id del cobrador.");

  const { from, to } = todayRange();
  const today = new Date().toISOString().slice(0, 10);

  const [payments, installments] = await Promise.all([
    // Pagos registrados hoy por este cobrador
    supabaseRequest<PaymentRow[]>(
      "/payments",
      {
        query: {
          select: "amount,paid_at",
          collector_id: `eq.${collectorId}`,
          and: `(paid_at.gte.${from},paid_at.lte.${to})`,
        },
      },
      "No se pudo cargar pagos del día.",
    ),
    // Cuotas asignadas al cobrador (activas)
    supabaseRequest<InstallmentRow[]>(
      "/installments",
      {
        query: {
          select:
            "id,amount_due,status,due_date,loan:loans!installments_loan_id_fkey(collector_id)",
          "loan.collector_id": `eq.${collectorId}`,
          status: "in.(PENDING,LATE)",
        },
      },
      "No se pudo cargar cuotas pendientes.",
    ),
  ]);

  const myInstallments = installments.filter(
    (i) => i.loan?.collector_id === collectorId,
  );
  const todayInstallments = myInstallments.filter((i) => i.due_date === today);
  const overdueInstallments = myInstallments.filter(
    (i) => i.due_date < today && i.status === "LATE",
  );

  const collectedToday = payments.reduce(
    (acc, p) => acc + Number(p.amount ?? 0),
    0,
  );
  const pendingToday = todayInstallments.reduce(
    (acc, i) => acc + Number(i.amount_due ?? 0),
    0,
  );
  const goalAmount = collectedToday + pendingToday;
  const goalPct =
    goalAmount > 0 ? Math.round((collectedToday / goalAmount) * 100) : 0;

  return {
    collectedToday: Math.round(collectedToday * 100) / 100,
    paymentsToday: payments.length,
    pendingToday: Math.round(pendingToday * 100) / 100,
    pendingCount: todayInstallments.length,
    overdueCount: overdueInstallments.length,
    goalAmount,
    goalPct,
  };
}
