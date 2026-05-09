/**
 * app/(collector)/cobros/payments/new.tsx
 * Registro de pagos — diseño premium con UX guiada por pasos
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

const PAYMENT_METHODS = [
  {
    label: "Efectivo",
    value: "CASH",
    icon: "cash-outline",
    color: theme.colors.success,
  },
  {
    label: "Transferencia",
    value: "TRANSFER",
    icon: "swap-horizontal-outline",
    color: theme.colors.primary,
  },
  {
    label: "Nequi",
    value: "NEQUI",
    icon: "phone-portrait-outline",
    color: "#7C3AED",
  },
  {
    label: "Daviplata",
    value: "DAVIPLATA",
    icon: "phone-portrait-outline",
    color: "#DC2626",
  },
  {
    label: "Otro",
    value: "OTHER",
    icon: "ellipsis-horizontal-circle-outline",
    color: theme.colors.textMuted,
  },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export default function NewPaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const params = useLocalSearchParams<{
    loanId?: string;
    installmentId?: string;
  }>();
  const collectorId = session?.user.id ?? "";

  const [loanSearch, setLoanSearch] = useState("");
  const [loanId, setLoanId] = useState(params.loanId ?? "");
  const [installmentId, setInstallmentId] = useState(
    params.installmentId ?? "",
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loansQuery = useQuery({
    queryKey: queryKeys.loans({ search: loanSearch.trim() || undefined }),
    queryFn: () => getLoans({ search: loanSearch.trim() || undefined }),
    enabled: loanSearch.trim().length >= 2,
  });

  const selectedLoan = useMemo(
    () => (loansQuery.data ?? []).find((l) => l.id === loanId),
    [loansQuery.data, loanId],
  );

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

  const suggestedAmount = useMemo(() => {
    if (selectedInstallment) {
      const paid = selectedInstallment.paidAmount ?? 0;
      return Math.max(selectedInstallment.amount - paid, 0);
    }
    return 0;
  }, [selectedInstallment]);

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async () => {
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
    onError: (err) =>
      setFormError(toApiError(err, "No se pudo registrar el pago.").message),
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
        subtitle="Recaudo guiado paso a paso"
      />

      {formError && <ErrorBanner message={formError} />}

      {/* PASO 1 — Préstamo */}
      <View style={s.stepBlock}>
        <StepBadge number={1} label="Préstamo" active={true} />

        {loanId && selectedLoan ? (
          <View style={s.selectedLoan}>
            <View style={s.selectedLoanAvatar}>
              <Text style={s.selectedLoanAvatarText}>
                {selectedLoan.clientName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedLoanName} numberOfLines={1}>
                {selectedLoan.clientName ?? "Cliente"}
              </Text>
              <Text style={s.selectedLoanSub}>
                Saldo:{" "}
                <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>
                  {formatCOP(selectedLoan.balance)}
                </Text>
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setLoanId("");
                setInstallmentId("");
                setLoanSearch("");
              }}
              style={s.clearBtn}
            >
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Card padded={false} style={{ overflow: "hidden" }}>
            <View style={s.searchInputWrap}>
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por nombre o documento..."
                placeholderTextColor={theme.colors.textMuted}
                value={loanSearch}
                onChangeText={setLoanSearch}
              />
            </View>

            {loansQuery.data && loansQuery.data.length > 0 && (
              <>
                {loansQuery.data.slice(0, 6).map((loan, i) => (
                  <Pressable
                    key={loan.id}
                    style={({ pressed }) => [
                      s.loanRow,
                      i > 0 && s.loanRowBorder,
                      pressed && { backgroundColor: theme.colors.surfaceAlt },
                    ]}
                    onPress={() => {
                      setLoanId(loan.id);
                      setLoanSearch("");
                    }}
                  >
                    <View style={s.loanAvatar}>
                      <Text style={s.loanAvatarText}>
                        {loan.clientName?.[0]?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.loanName} numberOfLines={1}>
                        {loan.clientName ?? "Cliente"}
                      </Text>
                      <Text style={s.loanSub}>
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
              </>
            )}

            {loansQuery.data?.length === 0 && loanSearch.trim().length >= 2 && (
              <Text style={s.noResults}>
                Sin resultados para "{loanSearch}"
              </Text>
            )}
          </Card>
        )}
      </View>

      {/* PASO 2 — Cuota */}
      {loanId && (
        <View style={s.stepBlock}>
          <StepBadge
            number={2}
            label="Cuota a pagar (opcional)"
            active={true}
          />
          <Card padded={false} style={{ overflow: "hidden" }}>
            {/* Auto */}
            <Pressable
              onPress={() => setInstallmentId("")}
              style={[
                s.installChip,
                installmentId === "" && s.installChipActive,
              ]}
            >
              <Ionicons
                name="flash"
                size={14}
                color={installmentId === "" ? "#fff" : theme.colors.primary}
              />
              <Text
                style={[
                  s.installChipText,
                  installmentId === "" && s.installChipTextActive,
                ]}
              >
                Auto (primera pendiente)
              </Text>
            </Pressable>

            {pendingInstallments.map((inst, i) => {
              const paid = inst.paidAmount ?? 0;
              const remaining = Math.max(inst.amount - paid, 0);
              const isSelected = installmentId === inst.id;
              const isOverdue = inst.status === "overdue";

              return (
                <Pressable
                  key={inst.id}
                  onPress={() => {
                    setInstallmentId(inst.id);
                    if (remaining > 0) setAmount(String(remaining));
                  }}
                  style={[
                    s.installRow,
                    i > 0 && s.installRowBorder,
                    isSelected && s.installRowSelected,
                    isOverdue && s.installRowOverdue,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.installDate}>Vence: {inst.dueDate}</Text>
                    {paid > 0 && (
                      <Text style={s.installPaid}>
                        Abonado: {formatCOP(paid)}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text
                      style={[
                        s.installAmount,
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
          </Card>
        </View>
      )}

      {/* PASO 3 — Monto */}
      {loanId && (
        <View style={s.stepBlock}>
          <StepBadge number={3} label="Monto a cobrar" active={true} />

          {suggestedAmount > 0 && (
            <Pressable
              style={s.suggestedBtn}
              onPress={() => setAmount(String(suggestedAmount))}
            >
              <Ionicons
                name="sparkles"
                size={14}
                color={theme.colors.primary}
              />
              <Text style={s.suggestedText}>
                Usar sugerido:{" "}
                <Text style={{ fontWeight: "700" }}>
                  {formatCOP(suggestedAmount)}
                </Text>
              </Text>
            </Pressable>
          )}

          <Card padded={false}>
            <View style={s.amountWrap}>
              <Text style={s.currencySign}>$</Text>
              <TextInput
                style={s.amountInput}
                placeholder="0"
                placeholderTextColor={theme.colors.border}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
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
        </View>
      )}

      {/* PASO 4 — Método */}
      {loanId && (
        <View style={s.stepBlock}>
          <StepBadge number={4} label="Método de pago" active={true} />
          <View style={s.methodGrid}>
            {PAYMENT_METHODS.map((m) => {
              const isActive = method === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMethod(m.value)}
                  style={[
                    s.methodCard,
                    isActive && {
                      borderColor: m.color,
                      borderWidth: 2,
                      backgroundColor: m.color + "0D",
                    },
                  ]}
                >
                  <View
                    style={[
                      s.methodIcon,
                      {
                        backgroundColor: isActive
                          ? m.color + "20"
                          : theme.colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Ionicons
                      name={m.icon as any}
                      size={20}
                      color={isActive ? m.color : theme.colors.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      s.methodLabel,
                      isActive && { color: m.color, fontWeight: "700" },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* PASO 5 — Notas */}
      {loanId && (
        <View style={s.stepBlock}>
          <StepBadge
            number={5}
            label="Observaciones (opcional)"
            active={false}
          />
          <Input
            placeholder="Ej: El cliente pagó en efectivo en su negocio..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* CTA */}
      {loanId && (
        <Button
          label={mutation.isPending ? "Registrando pago..." : "Confirmar pago"}
          loading={mutation.isPending}
          fullWidth
          size="lg"
          onPress={handleSubmit}
          disabled={
            !loanId || !amount || parseFloat(amount) <= 0 || mutation.isPending
          }
        />
      )}

      <View style={{ height: 24 }} />
    </CollectorShell>
  );
}

// ─── StepBadge ───────────────────────────────────────────────────────────────

function StepBadge({
  number,
  label,
  active,
}: {
  number: number;
  label: string;
  active: boolean;
}) {
  return (
    <View style={step.row}>
      <View style={[step.circle, active && step.circleActive]}>
        <Text style={[step.num, active && step.numActive]}>{number}</Text>
      </View>
      <Text style={step.label}>{label}</Text>
    </View>
  );
}

const step = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  circleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  num: { fontSize: 13, fontWeight: "700", color: theme.colors.textMuted },
  numActive: { color: "#fff" },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.textSecondary },
});

// ─── Utils + Styles ──────────────────────────────────────────────────────────

function formatCOP(v: number) {
  return v.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

const s = StyleSheet.create({
  stepBlock: { gap: 0 },

  selectedLoan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.xl,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary + "33",
  },
  selectedLoanAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLoanAvatarText: {
    fontWeight: "700",
    color: theme.colors.primary,
    fontSize: 17,
  },
  selectedLoanName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  selectedLoanSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },

  loanRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  loanRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  loanAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  loanAvatarText: {
    fontWeight: "700",
    color: theme.colors.primary,
    fontSize: 15,
  },
  loanName: { fontWeight: "600", color: theme.colors.text, fontSize: 14 },
  loanSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  noResults: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 14,
    padding: 16,
  },

  installChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  installChipActive: { backgroundColor: theme.colors.primary },
  installChipText: {
    fontWeight: "600",
    fontSize: 14,
    color: theme.colors.primary,
  },
  installChipTextActive: { color: "#fff" },
  installRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  installRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  installRowSelected: { backgroundColor: theme.colors.primarySoft },
  installRowOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.danger,
  },
  installDate: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  installPaid: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: "600",
    marginTop: 2,
  },
  installAmount: { fontSize: 15, fontWeight: "700", color: theme.colors.text },

  suggestedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary + "22",
  },
  suggestedText: { fontSize: 13, color: theme.colors.primary },

  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  currencySign: {
    fontSize: 32,
    color: theme.colors.textMuted,
    marginRight: 8,
    fontWeight: "300",
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -1,
  },
  amountConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  amountConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.success,
  },

  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  methodCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
