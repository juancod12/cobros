import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiFeedback } from '@/components/api-feedback';
import { queryKeys } from '@/services/query-keys';
import { getDashboardSummary, type DashboardAlertItem, type DashboardKpis } from '@/services/reports';
import { toApiError } from '@/types/api-error';

const emptyKpis: DashboardKpis = {
  collectionsToday: 0,
  activePortfolio: 0,
  delinquent: 0,
  chargedOff: 0,
  expensesToday: 0,
};
const todayISODate = new Date().toISOString().slice(0, 10);
const unitScopeSuffix = ['Solo unidades cerradas', 'Solo unidades abiertas'];

function formatCurrency(value: number) {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function AlertList({ title, items }: { title: string; items: DashboardAlertItem[] }) {
  return (
    <View style={styles.alertCard}>
      <Text style={styles.alertTitle}>{title}</Text>
      {items.length === 0 ? <Text style={styles.alertEmpty}>Sin novedades para este corte.</Text> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.alertRow}>
          <Text style={styles.alertLabel}>{item.label}</Text>
          {item.detail ? <Text style={styles.alertDetail}>{item.detail}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const [companyIndex, setCompanyIndex] = useState(0);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [showAllUnits, setShowAllUnits] = useState(true);
  const [fromDate, setFromDate] = useState(todayISODate);
  const [toDate, setToDate] = useState(todayISODate);

  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard({ date: toDate || undefined }),
    queryFn: () => getDashboardSummary({ date: toDate || undefined }),
  });

  const kpis = dashboard?.kpis ?? emptyKpis;
  const alerts = dashboard?.alerts;
  const companyOptions = dashboard?.collectors?.length ? dashboard.collectors : ['Operacion'];
  const safeCompanyIndex = companyOptions.length === 0 ? 0 : companyIndex % companyOptions.length;
  const unitScopes = useMemo(
    () => [`Todas las unidades (${companyOptions.length})`, ...unitScopeSuffix],
    [companyOptions.length]
  );

  const carteraMax = useMemo(() => {
    const base = Math.max(1000000, kpis.activePortfolio);
    return Math.ceil(base / 1000000) * 1000000;
  }, [kpis.activePortfolio]);
  const carteraPct = carteraMax === 0 ? 0 : Math.min(1, kpis.activePortfolio / carteraMax);

  const clientsCount = kpis.delinquent + kpis.chargedOff;
  const clientsMax = Math.max(10, clientsCount + 8);
  const clientsPct = Math.min(1, clientsCount / clientsMax);

  const collectionsGoal = Math.max(1, kpis.collectionsToday + kpis.expensesToday);
  const collectionPct = Math.min(1, kpis.collectionsToday / collectionsGoal);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filtersRow}>
          <Pressable
            onPress={() =>
              setCompanyIndex((current) => {
                const total = Math.max(companyOptions.length, 1);
                return (current + 1) % total;
              })
            }
            style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.selectText}>
              {companyOptions[safeCompanyIndex]}
            </Text>
            <Ionicons color="#6a6a70" name="chevron-down" size={18} />
          </Pressable>

          <Pressable
            onPress={() => setScopeIndex((current) => (current + 1) % unitScopes.length)}
            style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={styles.selectText}>
              {unitScopes[scopeIndex]}
            </Text>
            <Ionicons color="#6a6a70" name="chevron-down" size={18} />
          </Pressable>

          <Pressable
            onPress={() => setShowAllUnits((current) => !current)}
            style={({ pressed }) => [styles.checkboxWrap, pressed && styles.pressed]}>
            <Ionicons
              color="#59595f"
              name={showAllUnits ? 'checkbox-outline' : 'square-outline'}
              size={18}
            />
            <Text style={styles.checkboxText}>Ver todas las unidades</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelBadge}>
            <Ionicons color="#202020" name="bar-chart-outline" size={20} />
            <Text style={styles.panelBadgeText}>Dashboard</Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Fecha inicial</Text>
              <View style={styles.dateInputWrap}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setFromDate}
                  style={styles.dateInput}
                  value={fromDate}
                />
                <Ionicons color="#3f3f45" name="calendar-outline" size={18} />
              </View>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Fecha final</Text>
              <View style={styles.dateInputWrap}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setToDate}
                  style={styles.dateInput}
                  value={toDate}
                />
                <Ionicons color="#3f3f45" name="calendar-outline" size={18} />
              </View>
            </View>

            <Pressable onPress={() => void refetch()} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
              <Ionicons color="#ffffff" name="search-outline" size={20} />
            </Pressable>
          </View>

          <ApiFeedback
            error={error ? toApiError(error, 'No fue posible cargar dashboard.').message : null}
            isLoading={isLoading}
          />

          <View style={styles.chartsRow}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Cartera</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#3f6dcc' }]} />
                  <Text style={styles.legendText}>Valor en cartera</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: '#f13b1b' }]} />
                  <Text style={styles.legendText}>Numero de clientes</Text>
                </View>
              </View>

              <View style={styles.chartArea}>
                {[0, 1, 2, 3, 4, 5, 6].map((line) => (
                  <View key={`cartera-grid-${line}`} style={[styles.gridLine, { top: line * 34 }]} />
                ))}
                <View style={styles.axisLabelLeftWrap}>
                  <Text style={styles.axisText}>{formatCurrency(carteraMax)}</Text>
                  <Text style={styles.axisText}>$0</Text>
                </View>
                <View style={styles.axisLabelRightWrap}>
                  <Text style={styles.axisText}>{clientsMax}</Text>
                  <Text style={styles.axisText}>0</Text>
                </View>

                <View style={[styles.blueBar, { height: `${carteraPct * 100}%` }]} />
                <View style={[styles.redLine, { height: `${clientsPct * 100}%` }]} />
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Recaudos</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#3f6dcc' }]} />
                  <Text style={styles.legendText}>Total recaudado</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#f25720' }]} />
                  <Text style={styles.legendText}>Recaudo pretendido</Text>
                </View>
              </View>

              <View style={styles.chartArea}>
                {[0, 1, 2, 3, 4, 5, 6].map((line) => (
                  <View key={`recaudo-grid-${line}`} style={[styles.gridLine, { top: line * 34 }]} />
                ))}

                <View style={styles.axisLabelLeftWrap}>
                  <Text style={styles.axisText}>{formatCurrency(collectionsGoal)}</Text>
                  <Text style={styles.axisText}>$0</Text>
                </View>
                <View style={styles.axisLabelRightWrap}>
                  <Text style={styles.axisText}>100%</Text>
                  <Text style={styles.axisText}>0%</Text>
                </View>

                <View style={[styles.blueBarRight, { height: `${collectionPct * 100}%` }]} />
                <View style={[styles.orangeBarRight, { height: '100%' }]} />
              </View>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cobros del dia</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.collectionsToday)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cartera activa</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.activePortfolio)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Morosos / Castigo</Text>
              <Text style={styles.kpiValue}>
                {kpis.delinquent} / {kpis.chargedOff}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Gastos del dia</Text>
              <Text style={styles.kpiValue}>{formatCurrency(kpis.expensesToday)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Link href={{ pathname: '/reportes', params: { from: fromDate, to: toDate } }} style={styles.actionLink}>
              Abrir reportes
            </Link>
            <Link href={{ pathname: '/cobros/clients' }} style={styles.actionLink}>
              Gestionar clientes
            </Link>
            <Link href={{ pathname: '/caja/session' }} style={styles.actionLink}>
              Control de caja
            </Link>
          </View>
        </View>

        <View style={styles.alertsGrid}>
          <AlertList items={alerts?.inactivity ?? []} title="Inactividad" />
          <AlertList items={alerts?.criticalDelinquency ?? []} title="Mora critica" />
          <AlertList items={alerts?.unclosedSessions ?? []} title="Sesiones sin cerrar" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ececef',
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectBox: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderColor: '#8f3ab4',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    minWidth: 250,
    paddingHorizontal: 14,
  },
  selectText: {
    color: '#5f5f68',
    flex: 1,
    fontSize: 18,
    marginRight: 6,
  },
  checkboxWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  checkboxText: {
    color: '#3f3f48',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  panel: {
    backgroundColor: '#efefef',
    borderColor: '#d8d8d8',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  panelBadge: {
    alignItems: 'center',
    backgroundColor: '#95ca30',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flexDirection: 'row',
    gap: 8,
    left: -14,
    minHeight: 50,
    paddingHorizontal: 16,
    position: 'relative',
    top: -14,
  },
  panelBadgeText: {
    color: '#111111',
    fontSize: 33,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  dateField: {
    flex: 1,
    minWidth: 240,
  },
  dateLabel: {
    color: '#3e3e48',
    fontSize: 16,
    marginBottom: 6,
  },
  dateInputWrap: {
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderColor: '#d1d1d1',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 10,
  },
  dateInput: {
    color: '#303038',
    flex: 1,
    fontSize: 18,
    paddingVertical: 8,
  },
  searchButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#95ca30',
    borderRadius: 4,
    height: 50,
    justifyContent: 'center',
    width: 52,
  },
  chartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  chartCard: {
    flex: 1,
    minWidth: 320,
  },
  chartTitle: {
    color: '#17171f',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendSwatch: {
    borderRadius: 2,
    height: 10,
    width: 20,
  },
  legendLine: {
    height: 2,
    width: 26,
  },
  legendText: {
    color: '#3f3f48',
    fontSize: 13,
  },
  chartArea: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d9d9d9',
    borderRadius: 8,
    borderWidth: 1,
    height: 230,
    overflow: 'hidden',
    paddingHorizontal: 54,
    position: 'relative',
  },
  gridLine: {
    backgroundColor: '#d8d8d8',
    height: 1,
    left: 54,
    position: 'absolute',
    right: 54,
  },
  axisLabelLeftWrap: {
    bottom: 8,
    justifyContent: 'space-between',
    left: 8,
    position: 'absolute',
    top: 8,
  },
  axisLabelRightWrap: {
    bottom: 8,
    justifyContent: 'space-between',
    position: 'absolute',
    right: 8,
    top: 8,
  },
  axisText: {
    color: '#5b5b62',
    fontSize: 12,
  },
  blueBar: {
    backgroundColor: '#3f6dcc',
    bottom: 0,
    position: 'absolute',
    right: 72,
    width: 48,
  },
  redLine: {
    backgroundColor: '#ef3a1d',
    bottom: 0,
    position: 'absolute',
    right: 136,
    width: 2,
  },
  blueBarRight: {
    backgroundColor: '#3f6dcc',
    bottom: 0,
    left: 120,
    position: 'absolute',
    width: 36,
    zIndex: 2,
  },
  orangeBarRight: {
    backgroundColor: '#f25720',
    bottom: 0,
    left: 170,
    opacity: 0.38,
    position: 'absolute',
    width: 36,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  kpiCard: {
    backgroundColor: '#f8f8f8',
    borderColor: '#d9d9d9',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 160,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kpiLabel: {
    color: '#646472',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#1e1e28',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionLink: {
    backgroundColor: '#e9dcf2',
    borderRadius: 7,
    color: '#6d11a3',
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  alertsGrid: {
    gap: 10,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dedede',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  alertTitle: {
    color: '#2a2a31',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  alertEmpty: {
    color: '#696a77',
    fontSize: 13,
  },
  alertRow: {
    borderTopColor: '#ececec',
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  alertLabel: {
    color: '#2e2f37',
    fontSize: 14,
    fontWeight: '700',
  },
  alertDetail: {
    color: '#656572',
    fontSize: 13,
    marginTop: 2,
  },
});
