import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ui } from '@/constants/ui';

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export function AccessDenied({
  title = 'Sin permiso',
  message = 'No tienes permisos para acceder a esta sección.',
}: AccessDeniedProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff5f5',
    borderColor: '#f9caca',
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    gap: 8,
    margin: 16,
    padding: 14,
  },
  title: { color: ui.colors.danger, fontWeight: '800' },
  message: { color: ui.colors.textMuted },
});
