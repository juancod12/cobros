/**
 * CollectorShell
 * Layout principal para el rol COBRADOR.
 * Incluye header con gradiente, nav inferior y área de contenido scrollable.
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
  /** Si true, no wrappea el contenido en ScrollView */
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hola, {session?.user.name?.split(" ")[0] ?? "Cobrador"} 👋
          </Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <Link href="/(shared)/notifications" style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </Link>
      </View>

      {/* Content */}
      {noScroll ? (
        <View style={[styles.content, style]}>{children}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          <View style={{ height: 90 }} />
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
              <View style={styles.navItemInner}>
                <Ionicons
                  name={
                    active
                      ? (item.icon as any)
                      : (`${item.icon}-outline` as any)
                  }
                  size={22}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                />
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
    paddingHorizontal: theme.space.xl,
    paddingTop: Platform.OS === "web" ? 16 : 8,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: theme.radius.xxl,
    borderBottomRightRadius: theme.radius.xxl,
  },
  greeting: {
    fontSize: theme.font.lg,
    fontWeight: "700",
    color: "#fff",
  },
  date: {
    fontSize: theme.font.sm,
    color: theme.colors.navText,
    marginTop: 2,
    textTransform: "capitalize",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  content: {
    padding: theme.space.lg,
    gap: theme.space.lg,
  },

  bottomNav: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    ...theme.shadow.md,
  },
  navItem: {
    flex: 1,
  },
  navItemInner: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  navLabelActive: {
    color: theme.colors.primary,
  },
});
