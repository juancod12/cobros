/**
 * Crear nuevo préstamo / crédito
 * Campos: cliente, monto, interés, cuotas, frecuencia (diaria/semanal/mensual), fecha inicio.
 * Calcula valor de cuota en tiempo real.
 */
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CollectorShell } from "@/components/layout/collector-shell";
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  SectionHeader,
} from "@/components/ui/design-system";
import { theme } from "@/constants/theme";
import { getClients } from "@/services/clients";
import { createLoan } from "@/services/loans";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toApiError } from "@/types/api-error";

type Frequency = "daily" | "weekly" | "monthly";

const FREQ_OPTIONS: { label: string; value: Frequency; days: number }[] = [
  { label: "Diaria", value: "daily", days: 1 },
  { label: "Semanal", value: "weekly", days: 7 },
  { label: "Mensual", value: "monthly", days: 30 },
];

export default function NewLoanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  // Form state
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestPct, setInterestPct] = useState("");
  const [numInstallments, setNumInstallments] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Client search
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients({ search: clientSearch || undefined }),
    queryFn: () => getClients({ search: clientSearch || undefined }),
    enabled: clientSearch.length >= 2,
  });

  // Live calculation
  const calc = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const rate = parseFloat(interestPct) / 100 || 0;
    const n = parseInt(numInstallments) || 0;
    if (p <= 0 || n <= 0) return null;
    const total = p * (1 + rate);
    const installmentValue = total / n;
    return {
      total: round2(total),
      installmentValue: round2(installmentValue),
      totalInterest: round2(total - p),
    };
  }, [principal, interestPct, numInstallments]);

  const mutation = useMutation({
    mutationFn: createLoan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.loans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.fullAgenda(session?.user.id ?? ""),
        }),
      ]);
      router.replace("/(collector)/cobros/loans");
    },
    onError: (err) =>
      setFormError(toApiError(err, "No se pudo crear el préstamo.").message),
  });

  function validate() {
    if (!clientId) return "Selecciona un cliente.";
    const p = parseFloat(principal);
    if (!p || p <= 0) return "El monto debe ser mayor a 0.";
    const n = parseInt(numInstallments);
    if (!n || n <= 0) return "Las cuotas deben ser mayor a 0.";
    if (!startDate) return "Ingresa la fecha de inicio.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    mutation.mutate({
      clientId,
      collectorId: session?.user.id ?? "",
      principal: parseFloat(principal),
      interest: parseFloat(interestPct) || 0,
      installments: parseInt(numInstallments),
      startDate,
      // frequency se usará cuando el backend soporte el campo
    });
  }

  return (
    <CollectorShell>
      <SectionHeader
        title="Nuevo Préstamo"
        subtitle="Registra un crédito para un cliente"
      />

      {formError && <ErrorBanner message={formError} />}
      {mutation.error && !formError && (
        <ErrorBanner
          message={toApiError(mutation.error, "Error al guardar.").message}
        />
      )}

      {/* Cliente */}
      <Card>
        <Text style={s.sectionLabel}>1. Cliente</Text>
        <Input
          label="Buscar cliente"
          placeholder="Nombre, documento o teléfono..."
          value={clientSearch}
          onChangeText={(t) => {
            setClientSearch(t);
            setClientId("");
            setClientName("");
          }}
        />
        {clientId ? (
          <View style={s.selectedClient}>
            <Ionicons
              name="person-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={s.selectedClientName}>{clientName}</Text>
            <Pressable
              onPress={() => {
                setClientId("");
                setClientName("");
                setClientSearch("");
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.danger}
              />
            </Pressable>
          </View>
        ) : clientsQuery.data && clientSearch.length >= 2 ? (
          <View style={s.clientList}>
            {clientsQuery.data.slice(0, 5).map((c) => (
              <Pressable
                key={c.id}
                style={s.clientRow}
                onPress={() => {
                  setClientId(c.id);
                  setClientName(c.name);
                  setClientSearch("");
                }}
              >
                <View style={s.clientAvatar}>
                  <Text style={s.clientAvatarText}>
                    {c.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={s.clientRowName}>{c.name}</Text>
                  <Text style={s.clientRowDoc}>{c.document}</Text>
                </View>
              </Pressable>
            ))}
            {clientsQuery.data.length === 0 && (
              <Text style={s.noResults}>
                Sin resultados.{" "}
                <Text style={{ color: theme.colors.primary }}>
                  Crear cliente →
                </Text>
              </Text>
            )}
          </View>
        ) : null}
      </Card>

      {/* Condiciones del préstamo */}
      <Card>
        <Text style={s.sectionLabel}>2. Condiciones del crédito</Text>

        <Input
          label="Monto prestado (COP)"
          placeholder="Ej: 500000"
          value={principal}
          onChangeText={setPrincipal}
          keyboardType="numeric"
        />

        <Input
          label="Interés total (%)"
          placeholder="Ej: 20"
          value={interestPct}
          onChangeText={setInterestPct}
          keyboardType="numeric"
          hint="Porcentaje sobre el capital (no mensual)"
        />

        <Input
          label="Número de cuotas"
          placeholder="Ej: 12"
          value={numInstallments}
          onChangeText={setNumInstallments}
          keyboardType="numeric"
        />

        {/* Frecuencia */}
        <View style={{ gap: 6 }}>
          <Text style={s.fieldLabel}>Frecuencia de pago</Text>
          <View style={s.freqRow}>
            {FREQ_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setFrequency(opt.value)}
                style={[
                  s.freqChip,
                  frequency === opt.value && s.freqChipActive,
                ]}
              >
                <Text
                  style={[
                    s.freqLabel,
                    frequency === opt.value && s.freqLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Input
          label="Fecha de inicio"
          placeholder="YYYY-MM-DD"
          value={startDate}
          onChangeText={setStartDate}
          autoCapitalize="none"
        />
      </Card>

      {/* Preview del cálculo */}
      {calc && (
        <Card style={s.calcCard}>
          <Text style={s.calcTitle}>Resumen del préstamo</Text>
          <CalcRow label="Capital" value={formatCOP(parseFloat(principal))} />
          <CalcRow
            label="Interés total"
            value={formatCOP(calc.totalInterest)}
          />
          <CalcRow label="Total a pagar" value={formatCOP(calc.total)} bold />
          <CalcRow
            label={`Valor cuota (${FREQ_OPTIONS.find((f) => f.value === frequency)?.label})`}
            value={formatCOP(calc.installmentValue)}
            bold
            accent
          />
        </Card>
      )}

      <Button
        label={mutation.isPending ? "Guardando..." : "Crear préstamo"}
        loading={mutation.isPending}
        fullWidth
        size="lg"
        onPress={handleSubmit}
      />
    </CollectorShell>
  );
}

function CalcRow({
  label,
  value,
  bold = false,
  accent = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={cr.row}>
      <Text style={cr.label}>{label}</Text>
      <Text
        style={[
          cr.value,
          bold && cr.bold,
          accent && { color: theme.colors.primary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function formatCOP(v: number) {
  return v.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  selectedClient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: 10,
    marginTop: 4,
  },
  selectedClientName: {
    flex: 1,
    fontWeight: "700",
    color: theme.colors.primary,
    fontSize: theme.font.md,
  },
  clientList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    marginTop: 4,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { fontWeight: "800", color: theme.colors.primary },
  clientRowName: {
    fontWeight: "600",
    color: theme.colors.text,
    fontSize: theme.font.md,
  },
  clientRowDoc: { fontSize: theme.font.xs, color: theme.colors.textMuted },
  noResults: {
    padding: 12,
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
  freqRow: { flexDirection: "row", gap: 8 },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  freqChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  freqLabel: {
    fontWeight: "700",
    color: theme.colors.textSecondary,
    fontSize: theme.font.sm,
  },
  freqLabelActive: { color: "#fff" },
  calcCard: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryLight,
  },
  calcTitle: {
    fontWeight: "700",
    color: theme.colors.primary,
    fontSize: theme.font.md,
    marginBottom: 10,
  },
});

const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  label: { fontSize: theme.font.sm, color: theme.colors.textSecondary },
  value: { fontSize: theme.font.sm, color: theme.colors.text },
  bold: { fontWeight: "800", fontSize: theme.font.md },
});
