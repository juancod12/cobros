export const theme = {
  colors: {
    // Brand — deep navy + electric blue accent
    primary: "#1A56DB",
    primaryDark: "#1341B3",
    primaryLight: "#E8F0FE",
    primarySoft: "#F0F5FF",
    primaryGlow: "#3B82F6",

    accent: "#6366F1",
    accentLight: "#EEF2FF",

    // Semantic
    success: "#047857",
    successLight: "#ECFDF5",
    warning: "#B45309",
    warningLight: "#FFFBEB",
    danger: "#B91C1C",
    dangerLight: "#FEF2F2",

    // Neutrals — warm gray palette
    bg: "#F7F8FC",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F4F9",
    surfaceRaised: "#FFFFFF",
    border: "#E4E9F2",
    borderLight: "#EEF2F9",
    borderStrong: "#C9D3E8",

    // Text
    text: "#0D1526",
    textSecondary: "#3D4F6B",
    textMuted: "#7F8FA4",
    textInverse: "#FFFFFF",

    // Nav — rich dark
    navBg: "#0D1526",
    navSurface: "#172035",
    navBorder: "#263354",
    navText: "#8DA3C4",
    navActive: "#1A56DB",
    navActiveText: "#FFFFFF",

    // Status chips
    statusPaid: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    statusPending: { bg: "#FFFBEB", text: "#78350F", border: "#FDE68A" },
    statusOverdue: { bg: "#FEF2F2", text: "#7F1D1D", border: "#FECACA" },
    statusRisk: { bg: "#FFF7ED", text: "#7C2D12", border: "#FED7AA" },
    statusWriteoff: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 40,
  },

  font: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  shadow: {
    sm: {
      shadowColor: "#1A2E5A",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: "#1A2E5A",
      shadowOpacity: 0.09,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lg: {
      shadowColor: "#1A56DB",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    card: {
      shadowColor: "#1A2E5A",
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
  },
} as const;

export type Theme = typeof theme;

export const Colors = {
  light: {
    text: "#0D1526",
    background: "#F7F8FC",
    tint: "#1A56DB",
    icon: "#7F8FA4",
    tabIconDefault: "#7F8FA4",
    tabIconSelected: "#1A56DB",
  },
  dark: {
    text: "#E8EEF8",
    background: "#0D1526",
    tint: "#4F8EF7",
    icon: "#5A7BA0",
    tabIconDefault: "#5A7BA0",
    tabIconSelected: "#4F8EF7",
  },
} as const;
