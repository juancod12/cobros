import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AccessDenied } from '@/components/access-denied';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, Label, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { exportDailyReport, exportLoansReport, type ReportExportResult } from '@/services/reports';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { useAuthStore } from '@/store/auth-store';
import { can } from '@/utils/rbac';

type ExportFormat = 'pdf' | 'xlsx';
type ExportKind = 'daily' | 'loans';
const todayISODate = new Date().toISOString().slice(0, 10);

export default function ReportsScreen() {
  const { session } = useAuthStore();
  const params = useLocalSearchParams<{ collector?: string; from?: string; to?: string; format?: 'pdf' | 'xlsx' }>();
  const initialCollector = useMemo(() => (typeof params.collector === 'string' ? params.collector : ''), [params.collector]);
  const initialFromDate = useMemo(() => (typeof params.from === 'string' ? params.from : todayISODate), [params.from]);
  const initialToDate = useMemo(() => (typeof params.to === 'string' ? params.to : todayISODate), [params.to]);
  const initialFormat = useMemo<ExportFormat>(() => (params.format === 'xlsx' ? 'xlsx' : 'pdf'), [params.format]);
  const userPermissions = session?.user.permissions ?? [];

  const [collectorFilter, setCollectorFilter] = useState(initialCollector);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [activeDownload, setActiveDownload] = useState<ExportKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<ReportExportResult | null>(null);

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso a reportes." />;
  }

  const runExport = async (kind: ExportKind) => {
    setActiveDownload(kind);
    setErrorMessage(null);
    setDownloadResult(null);
    try {
      const filters = { collector: collectorFilter || undefined, from: fromDate || undefined, to: toDate || undefined, format } as const;
      const response = kind === 'daily' ? await exportDailyReport(filters) : await exportLoansReport(filters);
      setDownloadResult(response);
    } catch (error) {
      setErrorMessage(toApiError(error, 'No se pudo completar la exportacion.').message);
    } finally {
      setActiveDownload(null);
    }
  };

  return (
    <AppShell>
      <PageTitle title="Reportes y exportaciones" subtitle="Descarga reportes diarios y cartera en PDF o XLSX." />
      <Card>
        <SectionTitle>Filtros</SectionTitle>
        <Label>Cobrador (opcional)</Label>
        <AppInput value={collectorFilter} onChangeText={setCollectorFilter} autoCapitalize="none" />
        <Label>Fecha desde (YYYY-MM-DD)</Label>
        <AppInput value={fromDate} onChangeText={setFromDate} autoCapitalize="none" />
        <Label>Fecha hasta (YYYY-MM-DD)</Label>
        <AppInput value={toDate} onChangeText={setToDate} autoCapitalize="none" />
      </Card>
      <Card>
        <SectionTitle>Formato</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="PDF" active={format === 'pdf'} onPress={() => setFormat('pdf')} />
          <Chip label="XLSX" active={format === 'xlsx'} onPress={() => setFormat('xlsx')} />
        </View>
      </Card>
      <Card>
        <SectionTitle>Descargas</SectionTitle>
        <AppButton label={activeDownload === 'daily' ? 'Descargando reporte diario...' : 'Descargar reporte diario'} onPress={() => void runExport('daily')} disabled={activeDownload !== null} />
        <AppButton label={activeDownload === 'loans' ? 'Descargando prestamos...' : 'Descargar cartera de prestamos'} onPress={() => void runExport('loans')} disabled={activeDownload !== null} />
        {errorMessage ? <Text style={{ color: ui.colors.danger, fontWeight: '700' }}>{errorMessage}</Text> : null}
        {downloadResult ? <Text style={{ color: ui.colors.success, fontWeight: '700' }}>{downloadResult.message}</Text> : null}
        {downloadResult?.downloadUrl ? <Text style={{ color: ui.colors.primary, fontSize: 12 }}>URL: {downloadResult.downloadUrl}</Text> : null}
      </Card>
    </AppShell>
  );
}
