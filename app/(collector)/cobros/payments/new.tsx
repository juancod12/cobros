/**
 * app/(collector)/cobros/payments/new.tsx
 * Registro de pagos — rediseñado con design system SmartPay
 * Flujo: buscar préstamo → seleccionar cuota → ingresar monto → confirmar
 */
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CollectorShell } from "@/components/layout/collector-shell";
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  SectionHeader,
} from "@/components/ui/design-system";
import { theme } from "@/constants/theme";
import { getLoanInstallments, getLoans } from "@/services/loans";
import { createPayment } from "@/services/payments";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toApiError } from "@/types/api-error";

// ─── Métodos de pago ────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { label: "Efectivo", value: "CASH", icon: "cash-outline" },
  {
    label: "Transferencia",
    value: "TRANSFER",
    icon: "swap-horizontal-outline",
  },
  { label: "Nequi", value: "NEQUI", icon: "phone-portrait-outline" },
  { label: "Daviplata", value: "DAVIPLATA", icon: "phone-portrait-outline" },
  { label: "Otro", value: "OTHER", icon: "ellipsis-horizontal-outline" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

// ─── Pantalla principal ─────────────────────────────────────────────────────

export default function NewPaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const params = useLocalSearchParams<{
    loanId?: string;
    installmentId?: string;
    clientId?: string;
  }>();

  const collectorId = session?.user.id ?? "";

  // Form state
  const [loanSearch, setLoanSearch] = useState("");
  const [loanId, setLoanId] = useState(params.loanId ?? "");
  const [installmentId, setInstallmentId] = useState(
    params.installmentId ?? "",
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showLoanSearch, setShowLoanSearch] = useState(!params.loanId);

  // Buscar préstamos
  const loansQuery = useQuery({
    queryKey: queryKeys.loans({ search: loanSearch.trim() || undefined }),
    queryFn: () => getLoans({ search: loanSearch.trim() || undefined }),
    enabled: loanSearch.trim().length >= 2,
  });

  // Préstamo seleccionado
  const selectedLoan = useMemo(
    () => (loansQuery.data ?? []).find((l) => l.id === loanId),
    [loansQuery.data, loanId],
  );

  // Cuotas del préstamo seleccionado
  const installmentsQuery = useQuery({
    queryKey: queryKeys.loanInstallments(loanId),
    queryFn: () => getLoanInstallments(loanId),
    enabled: Boolean(loanId),
  });

  const pendingInstallments = useMemo(
    () => (installmentsQuery.data ?? []).filter((i) => i.status !== "paid"),
    [installmentsQuery.data],
  );

  const selectedInstallment = useMemo(
    () => installmentsQuery.data?.find((i) => i.id === installmentId),
    [installmentsQuery.data, installmentId],
  );

  // Monto sugerido
  const suggestedAmount = useMemo(() => {
    if (selectedInstallment) {
      const paid = selectedInstallment.paidAmount ?? 0;
      return Math.max(selectedInstallment.amount - paid, 0);
    }
    return 0;
  }, [selectedInstallment]);

  // Mutation de pago
  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.loans() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loan(loanId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.loanInstallments(loanId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collectorSummary(collectorId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.todayAgenda(collectorId),
        }),
      ]);

      router.replace(
        loanId
          ? (`/(collector)/cobros/loans/${loanId}` as any)
          : "/(collector)/cobros/loans",
      );
    },
    onError: (err) => {
      setFormError(toApiError(err, "No se pudo registrar el pago.").message);
    },
  });

  function handleSubmit() {
    setFormError(null);
    const amountNum = parseFloat(amount);

    if (!loanId) {
      setFormError("Selecciona un préstamo para continuar.");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      setFormError("Ingresa un monto válido mayor a cero.");
      return;
    }

    mutation.mutate({
      amount: amountNum,
      method,
      loanId,
      installmentId: installmentId || undefined,
      collectorId,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <CollectorShell>
      <SectionHeader
        title="Registrar pago"
        subtitle="Recaudo con selección de cuota"
      />

      {formError && <ErrorBanner message={formError} />}
      {mutation.error && !formError && (
        <ErrorBanner
          message={toApiError(mutation.error, "Error al guardar pago.").message}
        />
      )}

      {/* PASO 1 — Seleccionar préstamo */}
      <Card>
        <Text style={s.stepLabel}>1. Préstamo</Text>

        {/* Préstamo ya seleccionado */}
        {loanId && selectedLoan ? (
          <View style={s.selectedLoan}>
            <View style={s.selectedLoanInfo}>
              <Text style={s.selectedLoanClient} numberOfLines={1}>
                {selectedLoan.clientName ?? "Cliente"}
              </Text>
              <Text style={s.selectedLoanSub}>
                Saldo:{" "}
                <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>
                  {formatCOP(selectedLoan.balance)}
                </Text>
              </Text>
              <Text style={s.selectedLoanSub}>
                Cuotas: {selectedLoan.installmentsPaid}/
                {selectedLoan.installments} pagadas
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setLoanId("");
                setInstallmentId("");
                setShowLoanSearch(true);
              }}
              style={s.changeLoanBtn}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.danger}
              />
            </Pressable>
          </View>
        ) : (
          <>
            <Input
              label="Buscar cliente o ID de préstamo"
              placeholder="Nombre, documento..."
              value={loanSearch}
              onChangeText={setLoanSearch}
            />

            {/* Resultados de búsqueda */}
            {loansQuery.data && loansQuery.data.length > 0 && (
              <View style={s.loanResults}>
                {loansQuery.data.slice(0, 6).map((loan) => (
                  <Pressable
                    key={loan.id}
                    style={({ pressed }) => [
                      s.loanRow,
                      pressed && { backgroundColor: theme.colors.surfaceAlt },
                    ]}
                    onPress={() => {
                      setLoanId(loan.id);
                      setInstallmentId("");
                      setShowLoanSearch(false);
                      setLoanSearch("");
                    }}
                  >
                    <View style={s.loanRowAvatar}>
                      <Text style={s.loanRowAvatarText}>
                        {loan.clientName?.[0]?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.loanRowName} numberOfLines={1}>
                        {loan.clientName ?? "Cliente"}
                      </Text>
                      <Text style={s.loanRowSub}>
                        Saldo: {formatCOP(loan.balance)} ·{" "}
                        {loan.installmentsPending} cuotas pend.
                      </Text>
                    </View>
                    {loan.status && (
                      <Badge
                        label={
                          loan.status === "al_dia"
                            ? "Al día"
                            : loan.status === "riesgo"
                              ? "Riesgo"
                              : loan.status === "moroso"
                                ? "Moroso"
                                : "Castigo"
                        }
                        variant={
                          loan.status === "al_dia"
                            ? "paid"
                            : loan.status === "riesgo"
                              ? "risk"
                              : loan.status === "moroso"
                                ? "overdue"
                                : "writeoff"
                        }
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {loansQuery.data?.length === 0 && loanSearch.trim().length >= 2 && (
              <Text style={s.noResults}>
                Sin resultados para "{loanSearch}"
              </Text>
            )}
          </>
        )}
      </Card>

      {/* PASO 2 — Seleccionar cuota (solo si hay préstamo) */}
      {loanId && (
        <Card>
          <Text style={s.stepLabel}>2. Cuota (opcional)</Text>

          {installmentsQuery.isLoading ? (
            <Text style={s.loadingText}>Cargando cuotas...</Text>
          ) : (
            <>
              {/* Auto-asignar */}
              <Pressable
                onPress={() => setInstallmentId("")}
                style={[
                  s.installmentChip,
                  installmentId === "" && s.installmentChipActive,
                ]}
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={
                    installmentId === "" ? "#fff" : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    s.installmentChipText,
                    installmentId === "" && s.installmentChipTextActive,
                  ]}
                >
                  Auto (primera pendiente)
                </Text>
              </Pressable>

              {/* Lista de cuotas pendientes */}
              {pendingInstallments.map((inst) => {
                const paid = inst.paidAmount ?? 0;
                const remaining = Math.max(inst.amount - paid, 0);
                const isSelected = installmentId === inst.id;
                const isOverdue = inst.status === "overdue";

                return (
                  <Pressable
                    key={inst.id}
                    onPress={() => {
                      setInstallmentId(inst.id);
                      if (remaining > 0) {
                        setAmount(String(remaining));
                      }
                    }}
                    style={[
                      s.installmentRow,
                      isSelected && s.installmentRowActive,
                      isOverdue && s.installmentRowOverdue,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.installmentDate}>
                        Vence: {inst.dueDate}
                      </Text>
                      {paid > 0 && (
                        <Text style={s.installmentPaid}>
                          Abonado: {formatCOP(paid)}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text
                        style={[
                          s.installmentAmount,
                          isSelected && { color: theme.colors.primary },
                        ]}
                      >
                        {formatCOP(remaining)}
                      </Text>
                      <Badge
                        label={isOverdue ? "Vencida" : "Pendiente"}
                        variant={isOverdue ? "overdue" : "pending"}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
        </Card>
      )}

      {/* PASO 3 — Monto */}
      {loanId && (
        <Card>
          <Text style={s.stepLabel}>3. Monto a cobrar</Text>

          {/* Sugerido */}
          {suggestedAmount > 0 && (
            <Pressable
              style={s.suggestedRow}
              onPress={() => setAmount(String(suggestedAmount))}
            >
              <Ionicons
                name="sparkles"
                size={14}
                color={theme.colors.primary}
              />
              <Text style={s.suggestedText}>
                Usar monto sugerido:{" "}
                <Text style={{ fontWeight: "800" }}>
                  {formatCOP(suggestedAmount)}
                </Text>
              </Text>
            </Pressable>
          )}

          {/* Input monto */}
          <View style={s.amountInputWrap}>
            <Text style={s.currencySymbol}>$</Text>
            <TextInput
              style={s.amountInput}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          {/* Validación visual */}
          {amount && parseFloat(amount) > 0 && (
            <View style={s.amountConfirm}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.success}
              />
              <Text style={s.amountConfirmText}>
                {formatCOP(parseFloat(amount))}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* PASO 4 — Método de pago */}
      {loanId && (
        <Card>
          <Text style={s.stepLabel}>4. Método de pago</Text>
          <View style={s.methodsGrid}>
            {PAYMENT_METHODS.map((m) => {
              const isActive = method === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMethod(m.value)}
                  style={[s.methodChip, isActive && s.methodChipActive]}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={18}
                    color={isActive ? "#fff" : theme.colors.textSecondary}
                  />
                  <Text
                    style={[s.methodLabel, isActive && s.methodLabelActive]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {/* PASO 5 — Notas (opcional) */}
      {loanId && (
        <Card>
          <Text style={s.stepLabel}>5. Observaciones (opcional)</Text>
          <Input
            placeholder="Ej: El cliente abonó en efectivo en su negocio..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </Card>
      )}

      {/* Botón de confirmación */}
      {loanId && (
        <Button
          label={mutation.isPending ? "Guardando pago..." : "Confirmar pago"}
          loading={mutation.isPending}
          fullWidth
          size="lg"
          onPress={handleSubmit}
          disabled={
            !loanId || !amount || parseFloat(amount) <= 0 || mutation.isPending
          }
        />
      )}

      {/* Espaciador */}
      <View style={{ height: 20 }} />
    </CollectorShell>
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
  stepLabel: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Préstamo seleccionado
  selectedLoan: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  selectedLoanInfo: { flex: 1, gap: 3 },
  selectedLoanClient: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  selectedLoanSub: {
    fontSize: theme.font.xs,
    color: theme.colors.textSecondary,
  },
  changeLoanBtn: { padding: 4 },

  // Resultados búsqueda
  loanResults: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    marginTop: 8,
  },
  loanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  loanRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  loanRowAvatarText: {
    fontWeight: "800",
    color: theme.colors.primary,
    fontSize: theme.font.md,
  },
  loanRowName: {
    fontWeight: "700",
    color: theme.colors.text,
    fontSize: theme.font.md,
  },
  loanRowSub: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  noResults: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: theme.font.sm,
    paddingVertical: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sm,
    textAlign: "center",
    paddingVertical: 8,
  },

  // Cuotas
  installmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
  },
  installmentChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  installmentChipText: {
    fontWeight: "700",
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
  },
  installmentChipTextActive: { color: "#fff" },

  installmentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: 6,
    backgroundColor: theme.colors.surface,
  },
  installmentRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  installmentRowOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.danger,
  },
  installmentDate: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.text,
  },
  installmentPaid: {
    fontSize: theme.font.xs,
    color: theme.colors.success,
    fontWeight: "600",
  },
  installmentAmount: {
    fontSize: theme.font.md,
    fontWeight: "800",
    color: theme.colors.text,
  },

  // Monto
  suggestedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  suggestedText: {
    fontSize: theme.font.sm,
    color: theme.colors.primary,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 64,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "300",
    color: theme.colors.textMuted,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
  },
  amountConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  amountConfirmText: {
    fontSize: theme.font.md,
    fontWeight: "700",
    color: theme.colors.success,
  },

  // Métodos
  methodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  methodChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadow.sm,
  },
  methodLabel: {
    fontWeight: "600",
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
  },
  methodLabelActive: { color: "#fff" },
});
