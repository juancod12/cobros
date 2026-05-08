/**
 * Design System — SmartPay
 * Componentes base reutilizables para toda la app.
 * El admin puede extender estos sin modificar los originales.
 */
import { theme } from "@/constants/theme";
import { Link, type LinkProps } from "expo-router";
import React, { type ReactNode } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type PressableProps,
    type TextInputProps,
    type ViewStyle,
} from "react-native";

// ─── Typography ────────────────────────────────────────────────────────────

type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "caption"
  | "label"
  | "mono";

export function Typography({
  variant = "body",
  children,
  color,
  style,
  numberOfLines,
}: {
  variant?: TextVariant;
  children: ReactNode;
  color?: string;
  style?: object;
  numberOfLines?: number;
}) {
  const s = typoStyles[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[s, color ? { color } : null, style]}
    >
      {children}
    </Text>
  );
}

const typoStyles = StyleSheet.create({
  h1: {
    fontSize: theme.font.xxxl,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  h2: { fontSize: theme.font.xxl, fontWeight: "700", color: theme.colors.text },
  h3: { fontSize: theme.font.xl, fontWeight: "700", color: theme.colors.text },
  body: {
    fontSize: theme.font.md,
    fontWeight: "400",
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: theme.font.sm,
    fontWeight: "400",
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: theme.font.xs,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  mono: {
    fontSize: theme.font.sm,
    fontFamily: "monospace",
    color: theme.colors.textSecondary,
  },
});

// ─── Button ────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type BtnSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const vs = btnVariantStyles[variant];
  const ss = btnSizeStyles[size];

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        btnBase.root,
        ss.root,
        vs.root,
        fullWidth && { alignSelf: "stretch" },
        (pressed || disabled || loading) && { opacity: 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.textColor} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={[btnBase.text, ss.text, { color: vs.textColor }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const btnBase = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
  },
  text: { fontWeight: "700" },
});

const btnVariantStyles: Record<
  BtnVariant,
  { root: ViewStyle; textColor: string }
> = {
  primary: {
    root: { backgroundColor: theme.colors.primary, ...theme.shadow.lg },
    textColor: "#fff",
  },
  secondary: {
    root: {
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    textColor: theme.colors.primary,
  },
  ghost: {
    root: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textColor: theme.colors.textSecondary,
  },
  danger: {
    root: {
      backgroundColor: theme.colors.dangerLight,
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    textColor: theme.colors.danger,
  },
  success: {
    root: {
      backgroundColor: theme.colors.successLight,
      borderWidth: 1,
      borderColor: theme.colors.success,
    },
    textColor: theme.colors.success,
  },
};

const btnSizeStyles: Record<BtnSize, { root: ViewStyle; text: object }> = {
  sm: {
    root: { paddingHorizontal: 12, paddingVertical: 7 },
    text: { fontSize: theme.font.sm },
  },
  md: {
    root: { paddingHorizontal: 16, paddingVertical: 11 },
    text: { fontSize: theme.font.md },
  },
  lg: {
    root: { paddingHorizontal: 22, paddingVertical: 15 },
    text: { fontSize: theme.font.lg },
  },
};

// ─── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftSlot,
  rightSlot,
  style,
  ...rest
}: InputProps) {
  return (
    <View style={inputStyles.wrapper}>
      {label ? <Text style={inputStyles.label}>{label}</Text> : null}
      <View style={[inputStyles.row, error ? inputStyles.rowError : null]}>
        {leftSlot ? <View style={inputStyles.slot}>{leftSlot}</View> : null}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          {...rest}
          style={[inputStyles.input, style]}
        />
        {rightSlot ? <View style={inputStyles.slot}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={inputStyles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={inputStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { gap: 5 },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  rowError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
  },
  input: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
    paddingVertical: 10,
  },
  slot: { marginHorizontal: 4 },
  error: {
    fontSize: theme.font.xs,
    color: theme.colors.danger,
    fontWeight: "600",
  },
  hint: { fontSize: theme.font.xs, color: theme.colors.textMuted },
});

// ─── Card ──────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <View style={[cardStyles.root, padded && cardStyles.padded, style]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  padded: { padding: theme.space.lg },
});

// ─── Badge / Chip ──────────────────────────────────────────────────────────

type BadgeVariant =
  | "paid"
  | "pending"
  | "overdue"
  | "risk"
  | "writeoff"
  | "default";

export function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const v = badgeMap[variant];
  return (
    <View
      style={[
        badgeStyles.root,
        { backgroundColor: v.bg, borderColor: v.border },
      ]}
    >
      <Text style={[badgeStyles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const badgeMap: Record<
  BadgeVariant,
  { bg: string; text: string; border: string }
> = {
  paid: theme.colors.statusPaid,
  pending: theme.colors.statusPending,
  overdue: theme.colors.statusOverdue,
  risk: theme.colors.statusRisk,
  writeoff: theme.colors.statusWriteoff,
  default: {
    bg: theme.colors.surfaceAlt,
    text: theme.colors.textSecondary,
    border: theme.colors.border,
  },
};

const badgeStyles = StyleSheet.create({
  root: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

// ─── Stat Card ─────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  accentColor = theme.colors.primary,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  icon?: ReactNode;
}) {
  return (
    <Card style={statStyles.card}>
      <View style={statStyles.top}>
        {icon ? (
          <View
            style={[
              statStyles.iconBox,
              { backgroundColor: accentColor + "18" },
            ]}
          >
            {icon}
          </View>
        ) : null}
        <Text style={statStyles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={statStyles.value}>{value}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </Card>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, gap: 6 },
  top: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  value: {
    fontSize: theme.font.xxl,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sub: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});

// ─── Section Header ────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={sectionStyles.root}>
      <View style={{ flex: 1 }}>
        <Text style={sectionStyles.title}>{title}</Text>
        {subtitle ? (
          <Text style={sectionStyles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: theme.font.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

// ─── Divider ───────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[{ height: 1, backgroundColor: theme.colors.border }, style]}
    />
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={emptyStyles.root}>
      {icon ? <View style={emptyStyles.icon}>{icon}</View> : null}
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle ? <Text style={emptyStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  root: { alignItems: "center", paddingVertical: 40, gap: 8 },
  icon: { marginBottom: 8 },
  title: {
    fontSize: theme.font.lg,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  subtitle: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
});

// ─── LinkButton ────────────────────────────────────────────────────────────

export function LinkBtn({
  href,
  label,
}: {
  href: LinkProps["href"];
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        color: theme.colors.primary,
        fontWeight: "700",
        fontSize: theme.font.sm,
      }}
    >
      {label}
    </Link>
  );
}

// ─── Loading ───────────────────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bg,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text
        style={{
          marginTop: 12,
          color: theme.colors.textMuted,
          fontWeight: "600",
        }}
      >
        Cargando...
      </Text>
    </View>
  );
}

// ─── Error Banner ──────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={errorStyles.root}>
      <Text style={errorStyles.text}>{message}</Text>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  text: {
    color: theme.colors.danger,
    fontWeight: "600",
    fontSize: theme.font.sm,
  },
});
