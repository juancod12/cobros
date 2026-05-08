import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Chip, Label, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import {
  createLateFeePolicy,
  createTariff,
  getLateFeePolicies,
  getSystemSettings,
  getTariffs,
  updateLateFeePolicyStatus,
  updateSystemSettings,
  updateTariffStatus,
  type LateFeePolicy,
} from '@/services/admin-settings';
import { createBranch, createCompany, getBranches, getCompanies, updateBranchStatus, updateCompanyStatus } from '@/services/enterprise';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function ConfiguracionScreen() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const userPermissions = session?.user.permissions ?? [];
  const hasAccess = can(PERMISSIONS.MANAGE_USERS, userPermissions);

  const [timezone, setTimezone] = useState('America/Bogota');
  const [workdayStart, setWorkdayStart] = useState('08:00:00');
  const [graceHours, setGraceHours] = useState('2');
  const [daysToWriteoff, setDaysToWriteoff] = useState('45');
  const [autoCloseTime, setAutoCloseTime] = useState('23:59:00');
  const [sundayCounts, setSundayCounts] = useState(false);

  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffCommission, setNewTariffCommission] = useState('0');

  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyType, setNewPolicyType] = useState<LateFeePolicy['ruleType']>('FIXED');
  const [newPolicyValue, setNewPolicyValue] = useState('0');
  const [newPolicyGrace, setNewPolicyGrace] = useState('2');

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLegalId, setNewCompanyLegalId] = useState('');

  const [newBranchCompanyId, setNewBranchCompanyId] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const settingsQuery = useQuery({
    queryKey: queryKeys.adminSettings(),
    queryFn: getSystemSettings,
    enabled: hasAccess,
  });

  const tariffsQuery = useQuery({
    queryKey: queryKeys.tariffs(),
    queryFn: getTariffs,
    enabled: hasAccess,
  });

  const policiesQuery = useQuery({
    queryKey: queryKeys.lateFeePolicies(),
    queryFn: getLateFeePolicies,
    enabled: hasAccess,
  });

  const companiesQuery = useQuery({
    queryKey: queryKeys.companies(),
    queryFn: getCompanies,
    enabled: hasAccess,
  });

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches(),
    queryFn: () => getBranches(),
    enabled: hasAccess,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setTimezone(settingsQuery.data.businessTimezone);
    setWorkdayStart(settingsQuery.data.workdayStart);
    setGraceHours(String(settingsQuery.data.graceHours));
    setDaysToWriteoff(String(settingsQuery.data.daysToWriteoff));
    setAutoCloseTime(settingsQuery.data.autoCloseTime);
    setSundayCounts(settingsQuery.data.sundayCounts);
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.homeOverview() });
    },
  });

  const createTariffMutation = useMutation({
    mutationFn: createTariff,
    onSuccess: async () => {
      setNewTariffName('');
      setNewTariffCommission('0');
      await queryClient.invalidateQueries({ queryKey: queryKeys.tariffs() });
    },
  });

  const toggleTariffMutation = useMutation({
    mutationFn: (payload: { tariffId: string; active: boolean }) =>
      updateTariffStatus(payload.tariffId, payload.active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tariffs() });
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: createLateFeePolicy,
    onSuccess: async () => {
      setNewPolicyName('');
      setNewPolicyValue('0');
      setNewPolicyGrace('2');
      setNewPolicyType('FIXED');
      await queryClient.invalidateQueries({ queryKey: queryKeys.lateFeePolicies() });
    },
  });

  const togglePolicyMutation = useMutation({
    mutationFn: (payload: { policyId: string; active: boolean }) =>
      updateLateFeePolicyStatus(payload.policyId, payload.active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.lateFeePolicies() });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: async () => {
      setNewCompanyName('');
      setNewCompanyLegalId('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    },
  });

  const toggleCompanyMutation = useMutation({
    mutationFn: (payload: { companyId: string; active: boolean }) =>
      updateCompanyStatus(payload.companyId, payload.active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: async () => {
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchAddress('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.branches() });
    },
  });

  const toggleBranchMutation = useMutation({
    mutationFn: (payload: { branchId: string; active: boolean }) =>
      updateBranchStatus(payload.branchId, payload.active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.branches() });
    },
  });

  const loading =
    settingsQuery.isLoading ||
    tariffsQuery.isLoading ||
    policiesQuery.isLoading ||
    companiesQuery.isLoading ||
    branchesQuery.isLoading;

  const error =
    settingsQuery.error ||
    tariffsQuery.error ||
    policiesQuery.error ||
    companiesQuery.error ||
    branchesQuery.error ||
    updateSettingsMutation.error ||
    createTariffMutation.error ||
    toggleTariffMutation.error ||
    createPolicyMutation.error ||
    togglePolicyMutation.error ||
    createCompanyMutation.error ||
    toggleCompanyMutation.error ||
    createBranchMutation.error ||
    toggleBranchMutation.error;

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  if (!hasAccess) {
    return <AccessDenied message="Tu rol no tiene acceso a configuracion enterprise." />;
  }

  return (
    <AppShell>
      <PageTitle title="Configuracion" subtitle="Parametros enterprise: operacion, tarifas, mora y estructura organizacional." />

      <ApiFeedback
        isLoading={loading}
        error={error ? toApiError(error, 'No fue posible cargar la configuracion enterprise.').message : null}
      />

      <Card>
        <SectionTitle>Parametros globales</SectionTitle>
        <Label>Zona horaria</Label>
        <AppInput value={timezone} onChangeText={setTimezone} autoCapitalize="none" />
        <Label>Inicio jornada (HH:mm:ss)</Label>
        <AppInput value={workdayStart} onChangeText={setWorkdayStart} autoCapitalize="none" />
        <Label>Horas de gracia</Label>
        <AppInput value={graceHours} onChangeText={setGraceHours} keyboardType="numeric" />
        <Label>Dias a castigo</Label>
        <AppInput value={daysToWriteoff} onChangeText={setDaysToWriteoff} keyboardType="numeric" />
        <Label>Hora autocierre caja (HH:mm:ss)</Label>
        <AppInput value={autoCloseTime} onChangeText={setAutoCloseTime} autoCapitalize="none" />
        <Label>Contar domingo como mora</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip active={sundayCounts} label="Si" onPress={() => setSundayCounts(true)} />
          <Chip active={!sundayCounts} label="No" onPress={() => setSundayCounts(false)} />
        </View>
        <AppButton
          label={updateSettingsMutation.isPending ? 'Guardando parametros...' : 'Guardar parametros'}
          onPress={() =>
            updateSettingsMutation.mutate({
              businessTimezone: timezone,
              workdayStart,
              graceHours: Number(graceHours),
              daysToWriteoff: Number(daysToWriteoff),
              autoCloseTime,
              sundayCounts,
            })
          }
          disabled={updateSettingsMutation.isPending}
        />
      </Card>

      <Card>
        <SectionTitle>Tarifas</SectionTitle>
        <AppInput placeholder="Nombre tarifa" value={newTariffName} onChangeText={setNewTariffName} />
        <AppInput
          placeholder="Comision (decimal, ej 0.12)"
          value={newTariffCommission}
          onChangeText={setNewTariffCommission}
          keyboardType="numeric"
        />
        <AppButton
          label={createTariffMutation.isPending ? 'Creando tarifa...' : 'Crear tarifa'}
          onPress={() =>
            createTariffMutation.mutate({
              name: newTariffName,
              commissionPct: Number(newTariffCommission),
            })
          }
          disabled={createTariffMutation.isPending}
        />
        {(tariffsQuery.data ?? []).map((tariff) => (
          <Card key={tariff.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.text, fontWeight: '700' }}>{tariff.name}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Comision: {formatPercent(tariff.commissionPct)}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {tariff.active ? 'Activa' : 'Inactiva'}</Text>
            <AppButton
              variant="secondary"
              label={tariff.active ? 'Desactivar tarifa' : 'Activar tarifa'}
              onPress={() => toggleTariffMutation.mutate({ tariffId: tariff.id, active: !tariff.active })}
              disabled={toggleTariffMutation.isPending}
            />
          </Card>
        ))}
      </Card>

      <Card>
        <SectionTitle>Politicas de mora</SectionTitle>
        <AppInput placeholder="Nombre politica" value={newPolicyName} onChangeText={setNewPolicyName} />
        <Label>Tipo de regla</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['FIXED', 'PERCENTAGE', 'PER_DAY_FIXED', 'PER_DAY_PERCENTAGE'] as LateFeePolicy['ruleType'][]).map((type) => (
            <Chip key={type} active={newPolicyType === type} label={type} onPress={() => setNewPolicyType(type)} />
          ))}
        </View>
        <AppInput placeholder="Valor" value={newPolicyValue} onChangeText={setNewPolicyValue} keyboardType="numeric" />
        <AppInput
          placeholder="Horas de gracia"
          value={newPolicyGrace}
          onChangeText={setNewPolicyGrace}
          keyboardType="numeric"
        />
        <AppButton
          label={createPolicyMutation.isPending ? 'Creando politica...' : 'Crear politica'}
          onPress={() =>
            createPolicyMutation.mutate({
              name: newPolicyName,
              ruleType: newPolicyType,
              value: Number(newPolicyValue),
              graceHours: Number(newPolicyGrace),
            })
          }
          disabled={createPolicyMutation.isPending}
        />
        {(policiesQuery.data ?? []).map((policy) => (
          <Card key={policy.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.text, fontWeight: '700' }}>{policy.name}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Tipo: {policy.ruleType}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Valor: {policy.value}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Gracia: {policy.graceHours}h</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {policy.active ? 'Activa' : 'Inactiva'}</Text>
            <AppButton
              variant="secondary"
              label={policy.active ? 'Desactivar politica' : 'Activar politica'}
              onPress={() => togglePolicyMutation.mutate({ policyId: policy.id, active: !policy.active })}
              disabled={togglePolicyMutation.isPending}
            />
          </Card>
        ))}
      </Card>

      <Card>
        <SectionTitle>Empresas</SectionTitle>
        <AppInput placeholder="Nombre empresa" value={newCompanyName} onChangeText={setNewCompanyName} />
        <AppInput placeholder="NIT/ID legal" value={newCompanyLegalId} onChangeText={setNewCompanyLegalId} />
        <AppButton
          label={createCompanyMutation.isPending ? 'Creando empresa...' : 'Crear empresa'}
          onPress={() =>
            createCompanyMutation.mutate({
              name: newCompanyName,
              legalId: newCompanyLegalId,
            })
          }
          disabled={createCompanyMutation.isPending}
        />
        {(companiesQuery.data ?? []).map((company) => (
          <Card key={company.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.text, fontWeight: '700' }}>{company.name}</Text>
            <Text style={{ color: ui.colors.textMuted }}>NIT: {company.legalId}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {company.active ? 'Activa' : 'Inactiva'}</Text>
            <AppButton
              variant="secondary"
              label={company.active ? 'Desactivar empresa' : 'Activar empresa'}
              onPress={() => toggleCompanyMutation.mutate({ companyId: company.id, active: !company.active })}
              disabled={toggleCompanyMutation.isPending}
            />
          </Card>
        ))}
      </Card>

      <Card>
        <SectionTitle>Sucursales</SectionTitle>
        <Label>Empresa</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(companiesQuery.data ?? []).map((company) => (
            <Chip
              key={`create-branch-company-${company.id}`}
              active={newBranchCompanyId === company.id}
              label={company.name}
              onPress={() => setNewBranchCompanyId(company.id)}
            />
          ))}
        </View>
        <AppInput placeholder="Nombre sucursal" value={newBranchName} onChangeText={setNewBranchName} />
        <AppInput placeholder="Codigo sucursal" value={newBranchCode} onChangeText={setNewBranchCode} />
        <AppInput placeholder="Direccion sucursal" value={newBranchAddress} onChangeText={setNewBranchAddress} />
        <AppButton
          label={createBranchMutation.isPending ? 'Creando sucursal...' : 'Crear sucursal'}
          onPress={() =>
            createBranchMutation.mutate({
              companyId: newBranchCompanyId,
              name: newBranchName,
              code: newBranchCode,
              address: newBranchAddress,
            })
          }
          disabled={createBranchMutation.isPending || !newBranchCompanyId}
        />
        {(branchesQuery.data ?? []).map((branch) => (
          <Card key={branch.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <Text style={{ color: ui.colors.text, fontWeight: '700' }}>{branch.name}</Text>
            <Text style={{ color: ui.colors.textMuted }}>
              Empresa: {branch.companyName ?? branch.companyId}
            </Text>
            <Text style={{ color: ui.colors.textMuted }}>Codigo: {branch.code ?? '-'}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Direccion: {branch.address ?? '-'}</Text>
            <Text style={{ color: ui.colors.textMuted }}>Estado: {branch.active ? 'Activa' : 'Inactiva'}</Text>
            <AppButton
              variant="secondary"
              label={branch.active ? 'Desactivar sucursal' : 'Activar sucursal'}
              onPress={() => toggleBranchMutation.mutate({ branchId: branch.id, active: !branch.active })}
              disabled={toggleBranchMutation.isPending}
            />
          </Card>
        ))}
      </Card>
    </AppShell>
  );
}
