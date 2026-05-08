import { Link, type LinkProps } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps, type ViewProps } from 'react-native';

import { ui } from '@/constants/ui';

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function AppInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={ui.colors.textMuted} {...props} style={[styles.input, props.style]} />;
}

type AppButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({ label, variant = 'primary', style, ...props }: AppButtonProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}>
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextAlt]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  active,
  label,
  onPress,
}: {
  active?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({ href, children }: { href: LinkProps['href']; children: ReactNode }) {
  return (
    <Link href={href} style={styles.linkButton}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  titleWrap: { gap: 4 },
  title: { color: ui.colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: ui.colors.textMuted, fontSize: 14 },
  sectionTitle: { color: ui.colors.text, fontSize: 16, fontWeight: '700' },
  label: { color: ui.colors.textMuted, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: ui.colors.surface,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    gap: ui.space.sm,
    padding: ui.space.md,
    ...ui.shadow.card,
  },
  input: {
    backgroundColor: ui.colors.surfaceMuted,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    color: ui.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: ui.colors.primary,
    borderRadius: ui.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonSecondary: { backgroundColor: ui.colors.primarySoft },
  buttonDanger: { backgroundColor: ui.colors.dangerSoft },
  buttonPressed: { opacity: 0.86 },
  buttonText: { color: '#fff', fontWeight: '700' },
  buttonTextAlt: { color: ui.colors.text },
  chip: {
    backgroundColor: ui.colors.surfaceMuted,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: ui.colors.primary,
    borderColor: ui.colors.primary,
  },
  chipText: { color: ui.colors.text, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  linkButton: { color: ui.colors.primary, fontWeight: '700' },
});
