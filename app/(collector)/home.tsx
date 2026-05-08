/**
 * Home del COBRADOR
 * Dashboard personal: stats del día, agenda rápida, accesos directos.
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
    StatCard,
    Typography,
} from "@/components/ui/design-system";
import { theme } from "@/constants/theme";
import { getTodayAgenda } from "@/services/agenda";
import { getCollectorDailySummary } from "@/services/collector-summary";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toApiError } from "@/types/api-error";

export default function CollectorHome() {
  const { session } = useAuthStore();
  const collectorId = session?.user.id ?? "";

  const summaryQuery = useQuery({
    queryKey: queryKeys.collectorSummary(collectorId),
    queryFn: () => getCollectorDailySummary(collectorId),
    enabled: Boolean(collectorId),
  });

  const agendaQuery = useQuery({
    queryKey: queryKeys.todayAgenda(collectorId),
    queryFn: () => getTodayAgenda(collectorId),
    enabled: Boolean(collectorId),
  });

  const summary = summaryQuery.data;
  const pendingClients = useMemo(
    () =>
      (agendaQuery.data ?? []).filter((a) => a.status !== "paid").slice(0, 5),
    [agendaQuery.data],
  );

  if (summaryQuery.isLoading) return <LoadingScreen />;

  return (
    <CollectorShell>
      {/* Error global */}
      {summaryQuery.error && (
        <ErrorBanner
          message={
            toApiError(summaryQuery.error, "Error cargando resumen.").message
          }
        />
      )}

      {/* Stats del día */}
      <View>
        <SectionHeader
          title="Tu día hoy"
          subtitle="Resumen de tu jornada actual"
        />
        <View style={styles.statsRow}>
          <StatCard
            label="Cobrado hoy"
            value={formatCOP(summary?.collectedToday ?? 0)}
            sub={`${summary?.paymentsToday ?? 0} pagos`}
            accentColor={theme.colors.success}
            icon={
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.colors.success}
              />
            }
          />
          <StatCard
            label="Pendiente"
            value={formatCOP(summary?.pendingToday ?? 0)}
            sub={`${summary?.pendingCount ?? 0} clientes`}
            accentColor={theme.colors.warning}
            icon={
              <Ionicons name="time" size={18} color={theme.colors.warning} />
            }
          />
        </View>
        <View style={[styles.statsRow, { marginTop: theme.space.sm }]}>
          <StatCard
            label="En mora"
            value={String(summary?.overdueCount ?? 0)}
            sub="clientes atrasados"
            accentColor={theme.colors.danger}
            icon={
              <Ionicons name="warning" size={18} color={theme.colors.danger} />
            }
          />
          <StatCard
            label="Meta"
            value={`${summary?.goalPct ?? 0}%`}
            sub="del objetivo diario"
            accentColor={theme.colors.primary}
            icon={
              <Ionicons
                name="trending-up"
                size={18}
                color={theme.colors.primary}
              />
            }
          />
        </View>
      </View>

      {/* Accesos rápidos */}
      <View>
        <SectionHeader title="Acciones rápidas" />
        <View style={styles.quickActions}>
          <QuickAction
            icon="cash"
            label="Registrar pago"
            color={theme.colors.success}
            href="/(collector)/cobros/payments/new"
          />
          <QuickAction
            icon="calendar"
            label="Ver agenda"
            color={theme.colors.primary}
            href="/(collector)/agenda"
          />
          <QuickAction
            icon="person-add"
            label="Nuevo cliente"
            color={theme.colors.accent}
            href="/(collector)/cobros/clients/new"
          />
          <QuickAction
            icon="document-text"
            label="Nuevo crédito"
            color={theme.colors.warning}
            href="/(collector)/cobros/loans/new"
          />
        </View>
      </View>

      {/* Agenda del día — vista rápida */}
      <Card>
        <SectionHeader
          title="Cobros de hoy"
          subtitle={`${agendaQuery.data?.length ?? 0} clientes en ruta`}
          action={
            <Link href="/(collector)/agenda" style={linkStyle.link}>
              Ver todos →
            </Link>
          }
        />

        {agendaQuery.isLoading && (
          <Typography variant="bodySmall" color={theme.colors.textMuted}>
            Cargando agenda...
          </Typography>
        )}

        {agendaQuery.error && (
          <ErrorBanner message="No se pudo cargar la agenda." />
        )}

        {!agendaQuery.isLoading && pendingClients.length === 0 && (
          <EmptyState
            icon={
              <Ionicons
                name="checkmark-done-circle"
                size={36}
                color={theme.colors.success}
              />
            }
            title="¡Todo al día!"
            subtitle="No tienes cobros pendientes por hoy."
          />
        )}

        {pendingClients.map((item) => (
          <AgendaRow key={item.id} item={item} />
        ))}
      </Card>

      {/* Caja activa */}
      <CashSessionBanner />
    </CollectorShell>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  color,
  href,
}: {
  icon: string;
  label: string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [qaStyles.root, pressed && { opacity: 0.8 }]}
      >
        <View style={[qaStyles.icon, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={qaStyles.label} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const badgeVariant =
    item.status === "paid"
      ? "paid"
      : item.status === "overdue"
        ? "overdue"
        : "pending";

  return (
    <Link href={`/(collector)/cobros/clients/${item.clientId}` as any} asChild>
      <Pressable
        style={({ pressed }) => [
          arStyles.row,
          pressed && { backgroundColor: theme.colors.surfaceAlt },
        ]}
      >
        <View style={arStyles.avatar}>
          <Text style={arStyles.avatarText}>
            {item.clientName[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={arStyles.name} numberOfLines={1}>
            {item.clientName}
          </Text>
          <Text style={arStyles.address} numberOfLines={1}>
            {item.address ?? "Sin dirección"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={arStyles.amount}>{formatCOP(item.amountDue)}</Text>
          <Badge
            label={
              item.status === "paid"
                ? "Pagado"
                : item.status === "overdue"
                  ? "En mora"
                  : "Pendiente"
            }
            variant={badgeVariant}
          />
        </View>
      </Pressable>
    </Link>
  );
}

function CashSessionBanner() {
  return (
    <Card style={cashStyles.root}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={cashStyles.iconBox}>
          <Ionicons name="wallet" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cashStyles.title}>Control de Caja</Text>
          <Text style={cashStyles.sub}>Gestiona tu caja diaria</Text>
        </View>
        <Link href="/(collector)/caja/session" asChild>
          <Pressable>
            <Text style={cashStyles.link}>Abrir →</Text>
          </Pressable>
        </Link>
      </View>
    </Card>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

type AgendaItem = {
  id: string;
  clientId: string;
  clientName: string;
  address?: string;
  amountDue: number;
  status: "pending" | "paid" | "overdue";
};

// ─── Utils ─────────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: theme.space.sm },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
  },
});

const qaStyles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    alignItems: "center",
    width: "48%",
    gap: 8,
    ...theme.shadow.sm,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});

const arStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: theme.font.md,
  },
  name: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  address: { fontSize: theme.font.xs, color: theme.colors.textMuted },
  amount: {
    fontSize: theme.font.md,
    fontWeight: "800",
    color: theme.colors.text,
  },
});

const cashStyles = StyleSheet.create({
  root: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sub: { fontSize: theme.font.xs, color: theme.colors.textMuted },
  link: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.font.md,
  },
});

const linkStyle = StyleSheet.create({
  link: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: theme.font.sm,
  },
});
