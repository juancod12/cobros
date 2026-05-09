/**
 * Layout raíz del grupo (collector).
 * Stack sin header — CollectorShell maneja header y nav inferior.
 * La protección de ruta está en app/_layout.tsx (redirección por rol).
 */
import { Stack } from "expo-router";

export default function CollectorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="agenda" />

      {/* Cobros */}
      <Stack.Screen name="cobros/clients/index" />
      <Stack.Screen name="cobros/clients/[id]" />
      <Stack.Screen name="cobros/clients/new" />
      <Stack.Screen name="cobros/loans/index" />
      <Stack.Screen name="cobros/loans/[id]" />
      <Stack.Screen name="cobros/loans/new" />
      <Stack.Screen name="cobros/payments/new" />

      {/* Caja */}
      <Stack.Screen name="caja/open" />
      <Stack.Screen name="caja/session" />
      <Stack.Screen name="caja/movements" />
      <Stack.Screen name="caja/expenses" />
      <Stack.Screen name="caja/close" />

      {/* Gastos */}
      <Stack.Screen name="gastos/index" />
    </Stack>
  );
}
