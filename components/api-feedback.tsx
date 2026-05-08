import { StyleSheet, Text, View } from 'react-native';

import { ui } from '@/constants/ui';

type Props = {
  isLoading?: boolean;
  error?: string | null;
  loadingText?: string;
};

export function ApiFeedback({ isLoading, error, loadingText = 'Cargando...' }: Props) {
  if (isLoading) {
    return <Text style={styles.loading}>{loadingText}</Text>;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loading: { color: ui.colors.textMuted, fontWeight: '600' },
  errorContainer: {
    backgroundColor: ui.colors.dangerSoft,
    borderColor: '#f7c7c7',
    borderRadius: ui.radius.md,
    borderWidth: 1,
    padding: 10,
  },
  errorText: { color: ui.colors.danger, fontWeight: '700' },
});
