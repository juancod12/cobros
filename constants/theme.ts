export const theme = {
  colors: {
    // Brand
    primary: "#2563EB", // blue-600
    primaryDark: "#1D4ED8", // blue-700
    primaryLight: "#DBEAFE", // blue-100
    primarySoft: "#EFF6FF", // blue-50

    accent: "#6366F1", // indigo-500
    accentLight: "#EEF2FF", // indigo-50

    // Semantic
    success: "#059669", // emerald-600
    successLight: "#D1FAE5",
    warning: "#D97706", // amber-600
    warningLight: "#FEF3C7",
    danger: "#DC2626", // red-600
    dangerLight: "#FEE2E2",

    // Neutrals
    bg: "#F8FAFC", // slate-50
    surface: "#FFFFFF",
    surfaceAlt: "#F1F5F9", // slate-100
    border: "#E2E8F0", // slate-200
    borderLight: "#F1F5F9",

    // Text
    text: "#0F172A", // slate-900
    textSecondary: "#475569", // slate-600
    textMuted: "#94A3B8", // slate-400
    textInverse: "#FFFFFF",

    // Nav
    navBg: "#0F172A", // slate-900
    navText: "#CBD5E1", // slate-300
    navActive: "#2563EB",

    // Status chips
    statusPaid: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
    statusPending: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
    statusOverdue: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
    statusRisk: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
    statusWriteoff: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  font: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },

  shadow: {
    sm: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lg: {
      shadowColor: "#2563EB",
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;

/**
 * Colors — alias de compatibilidad para componentes legacy (ThemedText, ThemedView, Collapsible).
 * No eliminar: use-theme-color.ts y collapsible.tsx dependen de esto.
 */
export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F8FAFC",
    tint: "#2563EB",
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#2563EB",
  },
  dark: {
    text: "#F1F5F9",
    background: "#0F172A",
    tint: "#60A5FA",
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#60A5FA",
  },
} as const;
