/**
 * Home del COBRADOR — Dashboard premium
 * Diseño refinado: stats visuales, acciones rápidas con íconos elegantes, agenda integrada.
 */
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import React, { useMemo } from "react";
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
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toApiError } from "@/types/api-error";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type AgendaStatus = "pending" | "paid" | "overdue" | "partial";
type AgendaItem = {
  id: string;
  clientId: string;
  clientName: string;
  address?: string;
  amountDue: number;
  status: AgendaStatus;
};
type CollectorDailySummary = {
  collectedToday: number;
  paymentsToday: number;
  pendingToday: number;
  pendingCount: number;
  overdueCount: number;
  goalAmount: number;
  goalPct: number;
};

async function fetchTodayAgenda(collectorId: string): Promise<AgendaItem[]> {
  const mod = await import("@/services/agenda" as any);
  return mod.getTodayAgenda(collectorId) as Promise<AgendaItem[]>;
}

async function fetchCollectorSummary(
  collectorId: string,
): Promise<CollectorDailySummary> {
  const mod = await import("@/services/collector-summary" as any);
  return mod.getCollectorDailySummary(
    collectorId,
  ) as Promise<CollectorDailySummary>;
}

// ─── Pantalla principal ──────────────────────────────────────────────────────

export default function CollectorHome() {
  const { session } = useAuthStore();
  const collectorId = session?.user.id ?? "";

  const summaryQuery = useQuery({
    queryKey: queryKeys.collectorSummary(collectorId),
    queryFn: () => fetchCollectorSummary(collectorId),
    enabled: Boolean(collectorId),
  });

  const agendaQuery = useQuery({
    queryKey: queryKeys.todayAgenda(collectorId),
    queryFn: () => fetchTodayAgenda(collectorId),
    enabled: Boolean(collectorId),
  });

  const summary = summaryQuery.data;
  const pendingClients = useMemo(
    () =>
      (agendaQuery.data ?? [])
        .filter((a: AgendaItem) => a.status !== "paid")
        .slice(0, 5),
    [agendaQuery.data],
  );

  if (summaryQuery.isLoading) return <LoadingScreen />;

  const goalPct = Math.min(summary?.goalPct ?? 0, 100);

  return (
    <CollectorShell>
      {summaryQuery.error && (
        <ErrorBanner
          message={
            toApiError(summaryQuery.error, "Error cargando resumen.").message
          }
        />
      )}

      {/* KPI Cards row 1 */}
      <View>
        <SectionHeader title="Tu día hoy" subtitle="Resumen de jornada" />
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Cobrado hoy"
            value={formatCOP(summary?.collectedToday ?? 0)}
            sub={`${summary?.paymentsToday ?? 0} pagos`}
            color={theme.colors.success}
            iconName="checkmark-circle"
          />
          <KpiCard
            label="Pendiente"
            value={formatCOP(summary?.pendingToday ?? 0)}
            sub={`${summary?.pendingCount ?? 0} clientes`}
            color={theme.colors.warning}
            iconName="time"
          />
        </View>
        <View style={[styles.kpiGrid, { marginTop: 10 }]}>
          <KpiCard
            label="En mora"
            value={String(summary?.overdueCount ?? 0)}
            sub="clientes atrasados"
            color={theme.colors.danger}
            iconName="warning"
          />
          <MetaCard goalPct={goalPct} />
        </View>
      </View>

      {/* Acciones rápidas */}
      <View>
        <SectionHeader title="Acciones rápidas" />
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="cash-outline"
            label="Registrar pago"
            color={theme.colors.success}
            bgColor="#ECFDF5"
            href="/(collector)/cobros/payments/new"
          />
          <QuickAction
            icon="calendar-outline"
            label="Ver agenda"
            color={theme.colors.primary}
            bgColor={theme.colors.primaryLight}
            href="/(collector)/agenda"
          />
          <QuickAction
            icon="person-add-outline"
            label="Nuevo cliente"
            color="#7C3AED"
            bgColor="#F5F3FF"
            href="/(collector)/cobros/clients/new"
          />
          <QuickAction
            icon="document-text-outline"
            label="Nuevo crédito"
            color={theme.colors.warning}
            bgColor={theme.colors.warningLight}
            href="/(collector)/cobros/loans/new"
          />
        </View>
      </View>

      {/* Agenda del día */}
      <Card padded={false}>
        <View style={styles.agendaHeader}>
          <View>
            <Text style={styles.agendaTitle}>Cobros de hoy</Text>
            <Text style={styles.agendaSub}>
              {agendaQuery.data?.length ?? 0} clientes en ruta
            </Text>
          </View>
          <Link href="/(collector)/agenda" style={styles.verTodosLink}>
            Ver todos →
          </Link>
        </View>

        {agendaQuery.isLoading && (
          <Text style={styles.loadingText}>Cargando agenda...</Text>
        )}
        {agendaQuery.error && (
          <ErrorBanner message="No se pudo cargar la agenda." />
        )}
        {!agendaQuery.isLoading && pendingClients.length === 0 ? (
          <View style={{ paddingBottom: 8 }}>
            <EmptyState
              icon={
                <Ionicons
                  name="checkmark-done-circle"
                  size={32}
                  color={theme.colors.success}
                />
              }
              title="¡Todo al día!"
              subtitle="No tienes cobros pendientes por hoy."
            />
          </View>
        ) : (
          <>
            {pendingClients.map((item: AgendaItem, index: number) => (
              <AgendaRow
                key={item.id}
                item={item}
                isLast={index === pendingClients.length - 1}
              />
            ))}
          </>
        )}
      </Card>

      {/* Banner caja */}
      <CashSessionBanner />
    </CollectorShell>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  iconName,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  iconName: string;
}) {
  return (
    <View style={[kpi.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={kpi.topRow}>
        <Text style={kpi.label}>{label}</Text>
        <View style={[kpi.iconBox, { backgroundColor: color + "15" }]}>
          <Ionicons name={iconName as any} size={16} color={color} />
        </View>
      </View>
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.sub}>{sub}</Text>
    </View>
  );
}

function MetaCard({ goalPct }: { goalPct: number }) {
  const color =
    goalPct >= 80
      ? theme.colors.success
      : goalPct >= 50
        ? theme.colors.warning
        : theme.colors.primary;
  return (
    <View style={[kpi.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={kpi.topRow}>
        <Text style={kpi.label}>Meta diaria</Text>
        <View style={[kpi.iconBox, { backgroundColor: color + "15" }]}>
          <Ionicons name="trending-up" size={16} color={color} />
        </View>
      </View>
      <Text style={[kpi.value, { color }]}>{goalPct}%</Text>
      <View style={kpi.progressBg}>
        <View
          style={[
            kpi.progressFill,
            { width: `${goalPct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  bgColor,
  href,
}: {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  href: string;
}) {
  return (
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [
          qa.root,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={[qa.iconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={qa.label} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function AgendaRow({ item, isLast }: { item: AgendaItem; isLast: boolean }) {
  const badgeVariant =
    item.status === "paid"
      ? ("paid" as const)
      : item.status === "overdue"
        ? ("overdue" as const)
        : ("pending" as const);

  const badgeLabel =
    item.status === "paid"
      ? "Pagado"
      : item.status === "overdue"
        ? "En mora"
        : item.status === "partial"
          ? "Parcial"
          : "Pendiente";

  const avatarColor =
    item.status === "overdue"
      ? theme.colors.danger
      : item.status === "paid"
        ? theme.colors.success
        : theme.colors.primary;

  return (
    <Link href={`/(collector)/cobros/clients/${item.clientId}` as any} asChild>
      <Pressable
        style={({ pressed }) => [
          ar.row,
          !isLast && ar.border,
          pressed && ar.pressed,
        ]}
      >
        <View style={[ar.avatar, { backgroundColor: avatarColor + "15" }]}>
          <Text style={[ar.avatarText, { color: avatarColor }]}>
            {item.clientName[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ar.name} numberOfLines={1}>
            {item.clientName}
          </Text>
          {item.address ? (
            <Text style={ar.address} numberOfLines={1}>
              <Ionicons
                name="location-outline"
                size={11}
                color={theme.colors.textMuted}
              />{" "}
              {item.address}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={ar.amount}>{formatCOP(item.amountDue)}</Text>
          <Badge label={badgeLabel} variant={badgeVariant} />
        </View>
      </Pressable>
    </Link>
  );
}

function CashSessionBanner() {
  return (
    <Link href="/(collector)/caja/session" asChild>
      <Pressable
        style={({ pressed }) => [cash.root, pressed && { opacity: 0.9 }]}
      >
        <View style={cash.iconBox}>
          <Ionicons name="wallet" size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cash.title}>Control de caja</Text>
          <Text style={cash.sub}>Ver sesión activa y movimientos</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      </Pressable>
    </Link>
  );
}

// ─── Utils ─────────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", gap: 10 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  agendaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  agendaSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  verTodosLink: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  loadingText: {
    color: theme.colors.textMuted,
    padding: 16,
    textAlign: "center",
  },
});

const kpi = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadow.card,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  sub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },
  progressBg: {
    height: 4,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
});

const qa = StyleSheet.create({
  root: {
    width: "47.5%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    alignItems: "center",
    gap: 10,
    ...theme.shadow.card,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});

const ar = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  border: { borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  pressed: { backgroundColor: theme.colors.surfaceAlt },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 17 },
  name: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  address: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
});

const cash = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadow.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
