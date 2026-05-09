/**
 * CollectorShell — Layout premium del cobrador.
 * Header elegante con nombre + fecha, nav inferior refinado.
 */
import { theme } from "@/constants/theme";
import { useAuthStore } from "@/store/auth-store";
import { Ionicons } from "@expo/vector-icons";
import { Link, usePathname } from "expo-router";
import React, { type ReactNode } from "react";
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type ViewStyle,
} from "react-native";

const NAV_ITEMS = [
  { label: "Inicio", icon: "home", href: "/(collector)/home" as const },
  { label: "Agenda", icon: "calendar", href: "/(collector)/agenda" as const },
  { label: "Cobros", icon: "cash", href: "/(collector)/cobros/loans" as const },
  {
    label: "Clientes",
    icon: "people",
    href: "/(collector)/cobros/clients" as const,
  },
  { label: "Caja", icon: "wallet", href: "/(collector)/caja/session" as const },
] as const;

interface CollectorShellProps {
  children: ReactNode;
  noScroll?: boolean;
  style?: ViewStyle;
}

export function CollectorShell({
  children,
  noScroll = false,
  style,
}: CollectorShellProps) {
  const { session } = useAuthStore();
  const pathname = usePathname();
  const firstName = session?.user.name?.split(" ")[0] ?? "Cobrador";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Buenos días, {firstName} 👋</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <View style={styles.headerRight}>
          <Link href="/(shared)/notifications" style={styles.notifBtn}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.navActiveText}
            />
            <View style={styles.notifDot} />
          </Link>
        </View>
      </View>

      {/* Content */}
      {noScroll ? (
        <View style={[styles.content, style]}>{children}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.contentContainer, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(
            item.href.split("/").slice(0, 3).join("/"),
          );
          return (
            <Link key={item.href} href={item.href} style={styles.navItem}>
              <View
                style={[styles.navItemInner, active && styles.navItemActive]}
              >
                <View
                  style={active ? styles.navIconActive : styles.navIconInactive}
                >
                  <Ionicons
                    name={
                      active
                        ? (item.icon as any)
                        : (`${item.icon}-outline` as any)
                    }
                    size={20}
                    color={
                      active ? theme.colors.primary : theme.colors.textMuted
                    }
                  />
                </View>
                <Text
                  style={[styles.navLabel, active && styles.navLabelActive]}
                >
                  {item.label}
                </Text>
              </View>
            </Link>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function formatDate() {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },

  header: {
    backgroundColor: theme.colors.navBg,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 20 : 12,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 12,
    color: theme.colors.navText,
    marginTop: 2,
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },

  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.navSurface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: theme.colors.navBorder,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: theme.colors.navBg,
  },

  scroll: { flex: 1 },
  content: { flex: 1 },
  contentContainer: {
    padding: 20,
    gap: 16,
  },

  bottomNav: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 10,
    paddingHorizontal: 8,
    ...theme.shadow.md,
  },
  navItem: {
    flex: 1,
  },
  navItemInner: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    borderRadius: theme.radius.md,
  },
  navItemActive: {},
  navIconActive: {
    backgroundColor: theme.colors.primaryLight,
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconInactive: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.textMuted,
    letterSpacing: 0.1,
  },
  navLabelActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
