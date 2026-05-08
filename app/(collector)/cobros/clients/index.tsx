/**
 * app/(collector)/cobros/clients/index.tsx
 * Lista de clientes — diseño renovado con design system SmartPay
 */
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
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
import { getClients, type PortfolioStatus } from "@/services/clients";
import { queryKeys } from "@/services/query-keys";
import { toApiError } from "@/types/api-error";

// ─── Tipos de filtro ────────────────────────────────────────────────────────

type StatusFilter = "" | PortfolioStatus;

const STATUS_OPTIONS: {
  label: string;
  value: StatusFilter;
  variant: BadgeVariant;
}[] = [
  { label: "Todos", value: "", variant: "default" },
  { label: "Al día", value: "al_dia", variant: "paid" },
  { label: "Riesgo", value: "riesgo", variant: "risk" },
  { label: "Moroso", value: "moroso", variant: "overdue" },
  { label: "Castigo", value: "castigo", variant: "writeoff" },
];

type BadgeVariant =
  | "paid"
  | "pending"
  | "overdue"
  | "risk"
  | "writeoff"
  | "default";

const STATUS_BADGE: Record<
  PortfolioStatus,
  { label: string; variant: BadgeVariant }
> = {
  al_dia: { label: "Al día", variant: "paid" },
  riesgo: { label: "Riesgo", variant: "risk" },
  moroso: { label: "Moroso", variant: "overdue" },
  castigo: { label: "Castigo", variant: "writeoff" },
};

// ─── Pantalla principal ─────────────────────────────────────────────────────

export default function ClientsScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.clients({
      status: statusFilter || undefined,
      search: search.trim() || undefined,
    }),
    queryFn: () =>
      getClients({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      }),
  });

  // Totales por estado para el resumen
  const counts = useMemo(() => {
    const all = clients;
    return {
      total: all.length,
      alDia: all.filter((c) => c.portfolioStatus === "al_dia").length,
      riesgo: all.filter((c) => c.portfolioStatus === "riesgo").length,
      moroso: all.filter((c) => c.portfolioStatus === "moroso").length,
      castigo: all.filter((c) => c.portfolioStatus === "castigo").length,
    };
  }, [clients]);

  if (isLoading) return <LoadingScreen />;

  return (
    <CollectorShell>
      {/* Header con acción */}
      <View style={s.headerRow}>
        <SectionHeader
          title="Clientes"
          subtitle={`${counts.total} en tu cartera`}
        />
        <Link href="/(collector)/cobros/clients/new" asChild>
          <Pressable style={s.addBtn}>
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Nuevo</Text>
          </Pressable>
        </Link>
      </View>

      {/* Resumen de estados */}
      <View style={s.statsRow}>
        <StatPill
          label="Al día"
          count={counts.alDia}
          color={theme.colors.success}
        />
        <StatPill
          label="Riesgo"
          count={counts.riesgo}
          color={theme.colors.warning}
        />
        <StatPill
          label="Moroso"
          count={counts.moroso}
          color={theme.colors.danger}
        />
        <StatPill
          label="Castigo"
          count={counts.castigo}
          color={theme.colors.textMuted}
        />
      </View>

      {/* Buscador */}
      <View style={s.searchRow}>
        <Ionicons
          name="search"
          size={16}
          color={theme.colors.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Nombre, documento, teléfono..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* Filtros por estado */}
      <View style={s.filtersRow}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setStatusFilter(opt.value)}
            style={[
              s.filterChip,
              statusFilter === opt.value && s.filterChipActive,
            ]}
          >
            <Text
              style={[
                s.filterLabel,
                statusFilter === opt.value && s.filterLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Error */}
      {error && (
        <ErrorBanner
          message={
            toApiError(error, "No se pudo cargar la lista de clientes.").message
          }
        />
      )}

      {/* Lista */}
      {clients.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="people-outline"
              size={40}
              color={theme.colors.textMuted}
            />
          }
          title="Sin clientes"
          subtitle="Prueba con otro filtro o crea un nuevo cliente."
        />
      ) : (
        <Card padded={false}>
          {clients.map((client, idx) => (
            <Link
              key={client.id}
              href={`/(collector)/cobros/clients/${client.id}` as any}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  row.root,
                  idx > 0 && row.border,
                  pressed && { backgroundColor: theme.colors.surfaceAlt },
                ]}
              >
                {/* Avatar */}
                <View
                  style={[
                    row.avatar,
                    {
                      backgroundColor:
                        portfolioColor(client.portfolioStatus) + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      row.avatarText,
                      { color: portfolioColor(client.portfolioStatus) },
                    ]}
                  >
                    {client.name[0]?.toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={row.name} numberOfLines={1}>
                    {client.name}
                  </Text>
                  <View style={row.metaRow}>
                    <Ionicons
                      name="card-outline"
                      size={11}
                      color={theme.colors.textMuted}
                    />
                    <Text style={row.meta}>{client.document}</Text>
                  </View>
                  {client.contact ? (
                    <View style={row.metaRow}>
                      <Ionicons
                        name="call-outline"
                        size={11}
                        color={theme.colors.textMuted}
                      />
                      <Text style={row.meta}>{client.contact}</Text>
                    </View>
                  ) : null}
                  {client.collectorName ? (
                    <View style={row.metaRow}>
                      <Ionicons
                        name="person-outline"
                        size={11}
                        color={theme.colors.textMuted}
                      />
                      <Text style={row.meta} numberOfLines={1}>
                        {client.collectorName}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Badge + score */}
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {client.portfolioStatus ? (
                    <Badge
                      label={
                        STATUS_BADGE[client.portfolioStatus]?.label ??
                        client.portfolioStatus
                      }
                      variant={
                        STATUS_BADGE[client.portfolioStatus]?.variant ??
                        "default"
                      }
                    />
                  ) : null}
                  <View style={row.scoreRow}>
                    <Ionicons
                      name="star"
                      size={11}
                      color={theme.colors.warning}
                    />
                    <Text style={row.scoreText}>{client.score}</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </Card>
      )}
    </CollectorShell>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function StatPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={[pill.root, { borderColor: color + "44" }]}>
      <Text style={[pill.count, { color }]}>{count}</Text>
      <Text style={pill.label}>{label}</Text>
    </View>
  );
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function portfolioColor(status?: PortfolioStatus): string {
  if (status === "al_dia") return theme.colors.success;
  if (status === "riesgo") return theme.colors.warning;
  if (status === "moroso") return theme.colors.danger;
  if (status === "castigo") return theme.colors.textMuted;
  return theme.colors.primary;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    ...theme.shadow.lg,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: theme.font.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 46,
    ...theme.shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
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

const pill = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    gap: 2,
    ...theme.shadow.sm,
  },
  count: {
    fontSize: theme.font.xl,
    fontWeight: "800",
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
});

const row = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: theme.space.lg,
  },
  border: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: theme.font.lg,
  },
  name: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  scoreText: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
});
