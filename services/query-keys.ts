/**
 * Query Keys centralizadas para React Query.
 * Todas las queries de la app pasan por aquí — facilita invalidaciones precisas.
 */
export const queryKeys = {
  // ─── Home ─────────────────────────────────────────────────────────────
  homeOverview: () => ["home-overview"] as const,

  // ─── Collector ────────────────────────────────────────────────────────
  collectorSummary: (collectorId: string) =>
    ["collector-summary", collectorId] as const,
  todayAgenda: (collectorId: string) => ["agenda-today", collectorId] as const,
  fullAgenda: (collectorId: string) => ["agenda-full", collectorId] as const,

  // ─── Clients ──────────────────────────────────────────────────────────
  clients: (filters?: Record<string, string | undefined>) =>
    ["clients", filters ?? {}] as const,
  client: (id: string) => ["client", id] as const,

  // ─── Loans ────────────────────────────────────────────────────────────
  loans: (filters?: Record<string, string | undefined>) =>
    ["loans", filters ?? {}] as const,
  loan: (id: string) => ["loan", id] as const,
  loanInstallments: (id: string) => ["loan-installments", id] as const,

  // ─── Payments ─────────────────────────────────────────────────────────
  payments: (filters?: Record<string, string | undefined>) =>
    ["payments", filters ?? {}] as const,
  paymentHistory: (loanId: string) => ["payment-history", loanId] as const,

  // ─── Cash ─────────────────────────────────────────────────────────────
  cashSession: (id: string) => ["cash-session", id] as const,
  cashSessions: (collectorId: string) =>
    ["cash-sessions", collectorId] as const,

  // ─── Dashboard ────────────────────────────────────────────────────────
  dashboard: (filters?: Record<string, string | undefined>) =>
    ["dashboard", filters ?? {}] as const,

  // ─── Notifications ────────────────────────────────────────────────────
  notifications: (filters?: Record<string, string | undefined>) =>
    ["notifications", filters ?? {}] as const,

  // ─── Admin (estructura lista para el equipo de admin) ─────────────────
  adminUsers: (filters?: Record<string, string | undefined>) =>
    ["admin-users", filters ?? {}] as const,
  adminRoles: () => ["admin-roles"] as const,
  adminSettings: () => ["admin-settings"] as const,
  adminStats: () => ["admin-stats"] as const,

  // ─── Enterprise ───────────────────────────────────────────────────────
  companies: () => ["companies"] as const,
  branches: (companyId?: string) => ["branches", companyId ?? "all"] as const,
  tariffs: () => ["tariffs"] as const,
  lateFeePolicies: () => ["late-fee-policies"] as const,
};
