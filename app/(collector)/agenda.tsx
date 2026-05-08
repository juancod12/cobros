/**
 * Pantalla de Agenda del Cobrador
 * Lista diaria de cobros, filtros por estado, orden por ruta.
 */
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
import {
    getFullAgenda,
    type AgendaItem,
    type AgendaStatus,
} from "@/services/agenda";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toApiError } from "@/types/api-error";

const STATUS_FILTERS: { label: string; value: AgendaStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "En mora", value: "overdue" },
  { label: "Parcial", value: "partial" },
  { label: "Pagados", value: "paid" },
];

const BADGE_LABEL: Record<AgendaStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "En mora",
  partial: "Parcial",
};

const BADGE_VARIANT: Record<
  AgendaStatus,
  "paid" | "pending" | "overdue" | "risk" | "default"
> = {
  pending: "pending",
  paid: "paid",
  overdue: "overdue",
  partial: "risk",
};

export default function AgendaScreen() {
  const { session } = useAuthStore();
  const collectorId = session?.user.id ?? "";

  const [activeFilter, setActiveFilter] = useState<AgendaStatus | "all">("all");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: queryKeys.fullAgenda(collectorId),
    queryFn: () => getFullAgenda(collectorId),
    enabled: Boolean(collectorId),
  });

  const items = useMemo(() => {
    let list = query.data ?? [];

    if (activeFilter !== "all") {
      list = list.filter((i) => i.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.clientName.toLowerCase().includes(q) ||
          i.address?.toLowerCase().includes(q) ||
          i.clientPhone?.includes(q),
      );
    }

    return list;
  }, [query.data, activeFilter, search]);

  const summary = useMemo(() => {
    const all = query.data ?? [];
    return {
      total: all.length,
      paid: all.filter((i) => i.status === "paid").length,
      overdue: all.filter((i) => i.status === "overdue").length,
      pending: all.filter(
        (i) => i.status === "pending" || i.status === "partial",
      ).length,
      collected: all
        .filter((i) => i.status === "paid")
        .reduce((a, i) => a + i.paidAmount, 0),
      remaining: all
        .filter((i) => i.status !== "paid")
        .reduce((a, i) => a + i.balance, 0),
    };
  }, [query.data]);

  if (query.isLoading) return <LoadingScreen />;

  return (
    <CollectorShell>
      {query.error && (
        <ErrorBanner
          message={toApiError(query.error, "Error cargando agenda.").message}
        />
      )}

      {/* Mini resumen del día */}
      <Card>
        <SectionHeader
          title="Agenda de hoy"
          subtitle={`${summary.total} cuotas en tu ruta`}
        />
        <View style={styles.summaryRow}>
          <SummaryChip
            icon="checkmark-circle"
            color={theme.colors.success}
            label="Cobrados"
            value={summary.paid}
          />
          <SummaryChip
            icon="time"
            color={theme.colors.warning}
            label="Pendientes"
            value={summary.pending}
          />
          <SummaryChip
            icon="warning"
            color={theme.colors.danger}
            label="En mora"
            value={summary.overdue}
          />
        </View>
        <View style={styles.moneyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moneyLabel}>Cobrado</Text>
            <Text style={[styles.moneyValue, { color: theme.colors.success }]}>
              {formatCOP(summary.collected)}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.moneyLabel}>Por cobrar</Text>
            <Text style={[styles.moneyValue, { color: theme.colors.warning }]}>
              {formatCOP(summary.remaining)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Filtros y búsqueda */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search"
          size={16}
          color={theme.colors.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente, dirección..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setActiveFilter(f.value)}
            style={[
              styles.filterChip,
              activeFilter === f.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === f.value && styles.filterLabelActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista */}
      {items.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="calendar-outline"
              size={40}
              color={theme.colors.textMuted}
            />
          }
          title="Sin resultados"
          subtitle="Prueba con otro filtro o búsqueda."
        />
      ) : (
        <Card padded={false}>
          {items.map((item, idx) => (
            <AgendaCard key={item.id} item={item} isFirst={idx === 0} />
          ))}
        </Card>
      )}
    </CollectorShell>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function SummaryChip({
  icon,
  color,
  label,
  value,
}: {
  icon: string;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={[chipStyles.root, { backgroundColor: color + "14" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

function AgendaCard({ item, isFirst }: { item: AgendaItem; isFirst: boolean }) {
  const isOverdue = item.daysOverdue > 0 && item.status !== "paid";

  return (
    <Link
      href={
        `/(collector)/cobros/payments/new?loanId=${item.loanId}&installmentId=${item.id}` as any
      }
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          acStyles.root,
          !isFirst && acStyles.border,
          pressed && { backgroundColor: theme.colors.surfaceAlt },
          isOverdue && acStyles.overdueBorder,
        ]}
      >
        {/* Avatar + info */}
        <View
          style={[
            acStyles.avatar,
            { backgroundColor: avatarColor(item.status) },
          ]}
        >
          <Text style={acStyles.avatarText}>
            {item.clientName[0]?.toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={acStyles.name} numberOfLines={1}>
            {item.clientName}
          </Text>
          {item.address ? (
            <View style={acStyles.row}>
              <Ionicons
                name="location-outline"
                size={11}
                color={theme.colors.textMuted}
              />
              <Text style={acStyles.address} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          ) : null}
          {item.clientPhone ? (
            <View style={acStyles.row}>
              <Ionicons
                name="call-outline"
                size={11}
                color={theme.colors.textMuted}
              />
              <Text style={acStyles.address}>{item.clientPhone}</Text>
            </View>
          ) : null}
          <Text style={acStyles.dueDate}>
            Cuota {item.installmentNumber} · Vence {item.dueDate}
            {isOverdue ? ` · ${item.daysOverdue}d mora` : ""}
          </Text>
        </View>

        {/* Montos + badge */}
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={acStyles.amount}>{formatCOP(item.amountDue)}</Text>
          {item.paidAmount > 0 && item.status !== "paid" && (
            <Text style={acStyles.partial}>
              Pagado: {formatCOP(item.paidAmount)}
            </Text>
          )}
          <Badge
            label={BADGE_LABEL[item.status]}
            variant={BADGE_VARIANT[item.status] ?? "default"}
          />
        </View>
      </Pressable>
    </Link>
  );
}

function avatarColor(status: AgendaStatus): string {
  if (status === "paid") return theme.colors.successLight;
  if (status === "overdue") return theme.colors.dangerLight;
  if (status === "partial") return theme.colors.warningLight;
  return theme.colors.primaryLight;
}

// ─── Utils ─────────────────────────────────────────────────────────────────

function formatCOP(v: number) {
  return v.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  moneyRow: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  moneyLabel: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moneyValue: { fontSize: theme.font.xl, fontWeight: "800", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 44,
    ...theme.shadow.sm,
  },
  searchInput: { flex: 1, fontSize: theme.font.md, color: theme.colors.text },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterLabel: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  filterLabelActive: { color: "#fff" },
});

const chipStyles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  value: { fontSize: theme.font.xl, fontWeight: "800" },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
});

const acStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: theme.space.lg,
  },
  border: { borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  overdueBorder: { borderLeftWidth: 3, borderLeftColor: theme.colors.danger },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: theme.font.lg,
    color: theme.colors.primary,
  },
  name: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  address: { fontSize: theme.font.xs, color: theme.colors.textMuted, flex: 1 },
  dueDate: { fontSize: theme.font.xs, color: theme.colors.textMuted },
  amount: {
    fontSize: theme.font.lg,
    fontWeight: "800",
    color: theme.colors.text,
  },
  partial: {
    fontSize: theme.font.xs,
    color: theme.colors.success,
    fontWeight: "600",
  },
});
