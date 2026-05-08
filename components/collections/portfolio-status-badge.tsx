import { StyleSheet, Text, View } from 'react-native';

import { ui } from '@/constants/ui';
import type { PortfolioStatus } from '@/services/clients';

const STATUS_META: Record<PortfolioStatus, { label: string; backgroundColor: string; color: string }> = {
  al_dia: { label: 'Al dia', backgroundColor: ui.colors.successSoft, color: ui.colors.success },
  riesgo: { label: 'Riesgo', backgroundColor: ui.colors.warningSoft, color: ui.colors.warning },
  moroso: { label: 'Moroso', backgroundColor: ui.colors.dangerSoft, color: ui.colors.danger },
  castigo: { label: 'Castigo', backgroundColor: '#eceff5', color: ui.colors.text },
};

type PortfolioStatusBadgeProps = {
  status?: PortfolioStatus;
};

export function PortfolioStatusBadge({ status }: PortfolioStatusBadgeProps) {
  if (!status || !STATUS_META[status]) {
    return (
      <View style={[styles.badge, { backgroundColor: ui.colors.primarySoft }]}>
        <Text style={[styles.text, { color: ui.colors.textMuted }]}>Sin estado</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: STATUS_META[status].backgroundColor }]}>
      <Text style={[styles.text, { color: STATUS_META[status].color }]}>{STATUS_META[status].label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: ui.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
