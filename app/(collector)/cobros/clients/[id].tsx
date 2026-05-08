/**
 * app/(collector)/cobros/clients/[id].tsx
 * Detalle de cliente — historial de préstamos, pagos y estado de cartera
 */
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CollectorShell } from "@/components/layout/collector-shell";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingScreen,
  SectionHeader,
} from "@/components/ui/design-system";
import { theme } from "@/constants/theme";
import { getClientById } from "@/services/clients";
import { getLoans } from "@/services/loans";
import { queryKeys } from "@/services/query-keys";
import { toApiError } from "@/types/api-error";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type LoanStatus = "al_dia" | "riesgo" | "moroso" | "castigo";

const LOAN_STATUS_META: Record<
  LoanStatus,
  {
    label: string;
    variant: "paid" | "pending" | "overdue" | "risk" | "writeoff" | "default";
    color: string;
  }
> = {
  al_dia: { label: "Al día", variant: "paid", color: theme.colors.success },
  riesgo: { label: "Riesgo", variant: "risk", color: theme.colors.warning },
  moroso: { label: "Moroso", variant: "overdue", color: theme.colors.danger },
  castigo: {
    label: "Castigo",
    variant: "writeoff",
    color: theme.colors.textMuted,
  },
};

// ─── Pantalla principal ─────────────────────────────────────────────────────

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const clientQuery = useQuery({
    queryKey: queryKeys.client(id ?? ""),
    queryFn: () => getClientById(id ?? ""),
    enabled: Boolean(id),
  });

  // Préstamos de este cliente
  const loansQuery = useQuery({
    queryKey: queryKeys.loans({ search: id }),
    queryFn: () => getLoans({ search: id }),
    enabled: Boolean(id),
  });

  const client = clientQuery.data;
  const clientLoans = useMemo(
    () => (loansQuery.data ?? []).filter((l) => l.clientId === id),
    [loansQuery.data, id],
  );

  // Totales de cartera
  const totals = useMemo(() => {
    return {
      totalDeuda: clientLoans.reduce((a, l) => a + l.balance, 0),
      totalPagado: clientLoans.reduce((a, l) => a + l.paidTotal, 0),
      prestamosActivos: clientLoans.filter(
        (l) => l.status === "al_dia" || l.status === "riesgo",
      ).length,
      en_mora: clientLoans.filter(
        (l) => l.status === "moroso" || l.status === "castigo",
      ).length,
    };
  }, [clientLoans]);

  if (clientQuery.isLoading) return <LoadingScreen />;

  if (clientQuery.error || !client) {
    return (
      <CollectorShell>
        <ErrorBanner
          message={
            toApiError(clientQuery.error, "No se pudo cargar el cliente.")
              .message
          }
        />
      </CollectorShell>
    );
  }

  const statusMeta = client.portfolioStatus
    ? LOAN_STATUS_META[client.portfolioStatus as LoanStatus]
    : null;

  return (
    <CollectorShell>
      {/* Header del cliente */}
      <Card>
        <View style={s.clientHeader}>
          <View
            style={[
              s.bigAvatar,
              {
                backgroundColor: statusMeta
                  ? statusMeta.color + "18"
                  : theme.colors.primaryLight,
              },
            ]}
          >
            <Text
              style={[
                s.bigAvatarText,
                {
                  color: statusMeta?.color ?? theme.colors.primary,
                },
              ]}
            >
              {client.name[0]?.toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.clientName}>{client.name}</Text>
            {statusMeta && (
              <Badge label={statusMeta.label} variant={statusMeta.variant} />
            )}
          </View>
        </View>

        {/* Info básica */}
        <View style={s.infoGrid}>
          <InfoItem
            icon="card-outline"
            label="Documento"
            value={client.document}
          />
          <InfoItem
            icon="call-outline"
            label="Teléfono"
            value={client.contact || "Sin registrar"}
          />
          <InfoItem
            icon="star-outline"
            label="Score"
            value={String(client.score)}
          />
          <InfoItem
            icon="person-outline"
            label="Cobrador"
            value={client.collectorName ?? "No asignado"}
          />
        </View>

        {/* Acciones rápidas */}
        <View style={s.actionsRow}>
          <Link
            href={
              `/(collector)/cobros/payments/new?clientId=${client.id}` as any
            }
            asChild
          >
            <Pressable
              style={[s.actionBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="cash" size={16} color="#fff" />
              <Text style={[s.actionBtnText, { color: "#fff" }]}>
                Registrar pago
              </Text>
            </Pressable>
          </Link>

          <Link
            href={`/(collector)/cobros/loans/new?clientId=${client.id}` as any}
            asChild
          >
            <Pressable
              style={[
                s.actionBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[s.actionBtnText, { color: theme.colors.primary }]}>
                Nuevo crédito
              </Text>
            </Pressable>
          </Link>
        </View>
      </Card>

      {/* Resumen de cartera */}
      <Card>
        <SectionHeader
          title="Resumen de cartera"
          subtitle={`${clientLoans.length} préstamo${clientLoans.length !== 1 ? "s" : ""}`}
        />
        <View style={s.totalsRow}>
          <TotalChip
            label="Saldo pendiente"
            value={formatCOP(totals.totalDeuda)}
            color={theme.colors.danger}
          />
          <TotalChip
            label="Total pagado"
            value={formatCOP(totals.totalPagado)}
            color={theme.colors.success}
          />
        </View>
        <View style={s.totalsRow}>
          <TotalChip
            label="Activos"
            value={String(totals.prestamosActivos)}
            color={theme.colors.primary}
          />
          <TotalChip
            label="En mora"
            value={String(totals.en_mora)}
            color={theme.colors.warning}
          />
        </View>
      </Card>

      {/* Historial de préstamos */}
      <SectionHeader
        title="Historial de préstamos"
        subtitle="Créditos registrados para este cliente"
      />

      {loansQuery.isLoading ? (
        <Text style={s.loadingText}>Cargando historial...</Text>
      ) : loansQuery.error ? (
        <ErrorBanner
          message={
            toApiError(loansQuery.error, "No se pudo cargar el historial.")
              .message
          }
        />
      ) : clientLoans.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="document-outline"
              size={40}
              color={theme.colors.textMuted}
            />
          }
          title="Sin préstamos"
          subtitle="Este cliente no tiene créditos registrados."
        />
      ) : (
        <>
          {clientLoans.map((loan) => {
            const meta =
              LOAN_STATUS_META[loan.status as LoanStatus] ??
              LOAN_STATUS_META.al_dia;

            const paid = loan.installmentsPaid;
            const total = loan.installments;
            const progress = total > 0 ? paid / total : 0;

            return (
              <Link
                key={loan.id}
                href={`/(collector)/cobros/loans/${loan.id}` as any}
                asChild
              >
                <Pressable
                  style={({ pressed }) => [
                    loanCard.root,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {/* Cabecera del préstamo */}
                  <View style={loanCard.header}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={loanCard.amount}>
                        {formatCOP(loan.principal)}
                      </Text>
                      <Text style={loanCard.date}>
                        Inicio: {loan.startDate}
                      </Text>
                    </View>
                    <Badge label={meta.label} variant={meta.variant} />
                  </View>

                  {/* Barra de progreso */}
                  <View style={loanCard.progressWrap}>
                    <View style={loanCard.progressBg}>
                      <View
                        style={[
                          loanCard.progressFill,
                          {
                            width: `${Math.round(progress * 100)}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={loanCard.progressLabel}>
                      {paid}/{total} cuotas
                    </Text>
                  </View>

                  {/* Montos */}
                  <View style={loanCard.moneyRow}>
                    <MoneyItem
                      label="Saldo"
                      value={formatCOP(loan.balance)}
                      color={
                        loan.balance > 0
                          ? theme.colors.danger
                          : theme.colors.success
                      }
                    />
                    <MoneyItem
                      label="Pagado"
                      value={formatCOP(loan.paidTotal)}
                      color={theme.colors.success}
                    />
                    <MoneyItem
                      label="Total"
                      value={formatCOP(loan.totalDue)}
                      color={theme.colors.textSecondary}
                    />
                  </View>

                  {/* Footer */}
                  {loan.installmentsOverdue > 0 && (
                    <View style={loanCard.overdueRow}>
                      <Ionicons
                        name="warning"
                        size={13}
                        color={theme.colors.danger}
                      />
                      <Text style={loanCard.overdueText}>
                        {loan.installmentsOverdue} cuota
                        {loan.installmentsOverdue !== 1 ? "s" : ""} vencida
                        {loan.installmentsOverdue !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </>
      )}
    </CollectorShell>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={info.root}>
      <View style={info.iconBox}>
        <Ionicons name={icon as any} size={14} color={theme.colors.primary} />
      </View>
      <View>
        <Text style={info.label}>{label}</Text>
        <Text style={info.value}>{value}</Text>
      </View>
    </View>
  );
}

function TotalChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[tc.root, { borderColor: color + "33" }]}>
      <Text style={tc.label}>{label}</Text>
      <Text style={[tc.value, { color }]}>{value}</Text>
    </View>
  );
}

function MoneyItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          fontSize: theme.font.xs,
          color: theme.colors.textMuted,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function formatCOP(v: number) {
  return v.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  bigAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: {
    fontSize: theme.font.xxl,
    fontWeight: "800",
  },
  clientName: {
    fontSize: theme.font.xl,
    fontWeight: "800",
    color: theme.colors.text,
  },
  infoGrid: {
    gap: 10,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: theme.font.sm,
  },
  totalsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
});

const info = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: theme.font.md,
    color: theme.colors.text,
    fontWeight: "600",
  },
});

const tc = StyleSheet.create({
  root: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: theme.font.lg,
    fontWeight: "800",
  },
});

const loanCard = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    gap: 12,
    ...theme.shadow.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  amount: {
    fontSize: theme.font.xl,
    fontWeight: "800",
    color: theme.colors.text,
  },
  date: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  progressWrap: {
    gap: 6,
  },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  overdueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.sm,
    padding: 8,
  },
  overdueText: {
    fontSize: theme.font.xs,
    color: theme.colors.danger,
    fontWeight: "700",
  },
});
