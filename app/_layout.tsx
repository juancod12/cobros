import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { queryClient } from "@/services/query-client";
import { hydrateAuthSession, useAuthStore } from "@/store/auth-store";
import { ROLES } from "@/types/rbac";

export const unstable_settings = {
  // El anchor define el "home" por defecto del stack,
  // lo ponemos en (tabs) para que el back button funcione bien en admin.
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { session, isHydrated } = useAuthStore();

  useEffect(() => {
    hydrateAuthSession();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    // No autenticado → login
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // Autenticado en pantalla de auth → redirigir según rol
    if (session && inAuthGroup) {
      const role = session.user.role;

      if (role === ROLES.COLLECTOR) {
        // Cobrador va a su propio home
        router.replace("/(collector)/home");
      } else {
        // Admin / AUX van al panel principal
        router.replace("/(tabs)");
      }
    }
  }, [isHydrated, router, segments, session]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Rutas del cobrador — sin header propio, CollectorShell maneja el UI */}
          <Stack.Screen name="(collector)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
