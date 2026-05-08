import { Stack } from 'expo-router';

export default function CashLayout() {
  return (
    <Stack>
      <Stack.Screen name="open" options={{ title: 'Apertura de caja' }} />
      <Stack.Screen name="session" options={{ title: 'Sesión de caja' }} />
      <Stack.Screen name="movements" options={{ title: 'Movimientos de caja' }} />
      <Stack.Screen name="expenses" options={{ title: 'Gastos de caja' }} />
      <Stack.Screen name="close" options={{ title: 'Cierre de caja' }} />
    </Stack>
  );
}
