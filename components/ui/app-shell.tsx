import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native';

import { ui } from '@/constants/ui';

type AppShellProps = {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  style?: ViewProps['style'];
};

export function AppShell({ children, scroll = true, contentContainerStyle, style }: AppShellProps) {
  return (
    <View style={styles.bg}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} style={style}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, style]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: ui.colors.bgTop, flex: 1 },
  content: {
    gap: ui.space.md,
    minHeight: '100%',
    padding: ui.space.lg,
    paddingBottom: ui.space.xl * 2,
  },
});
