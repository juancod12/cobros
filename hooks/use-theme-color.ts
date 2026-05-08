/**
 * Simplified hook — the new design system uses `theme` directly.
 * This shim keeps ThemedText / ThemedView working without breaking anything.
 */

import { useColorScheme } from "@/hooks/use-color-scheme";

const fallbackColors = {
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
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof fallbackColors.light,
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return fallbackColors[theme][colorName];
}
