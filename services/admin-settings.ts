import { supabaseRequest } from '@/services/http';
import { ApiError } from '@/types/api-error';

export type SystemSettings = {
  businessTimezone: string;
  workdayStart: string;
  sundayCounts: boolean;
  graceHours: number;
  daysToWriteoff: number;
  autoCloseTime: string;
};

export type Tariff = {
  id: string;
  name: string;
  commissionPct: number;
  active: boolean;
  createdAt: string;
};

export type LateFeePolicy = {
  id: string;
  name: string;
  ruleType: 'FIXED' | 'PERCENTAGE' | 'PER_DAY_FIXED' | 'PER_DAY_PERCENTAGE';
  value: number;
  graceHours: number;
  active: boolean;
  createdAt: string;
};

type SettingsRow = {
  business_timezone: string;
  workday_start: string;
  sunday_counts: boolean;
  grace_hours: number;
  days_to_writeoff: number;
  auto_close_time: string;
};

type TariffRow = {
  id: string;
  name: string;
  commission_pct: number;
  active: boolean;
  created_at: string;
};

type LateFeePolicyRow = {
  id: string;
  name: string;
  rule_type: 'FIXED' | 'PERCENTAGE' | 'PER_DAY_FIXED' | 'PER_DAY_PERCENTAGE';
  value: number;
  grace_hours: number;
  active: boolean;
  created_at: string;
};

function mapSettings(row: SettingsRow): SystemSettings {
  return {
    businessTimezone: row.business_timezone,
    workdayStart: row.workday_start,
    sundayCounts: row.sunday_counts,
    graceHours: row.grace_hours,
    daysToWriteoff: row.days_to_writeoff,
    autoCloseTime: row.auto_close_time,
  };
}

function mapTariff(row: TariffRow): Tariff {
  return {
    id: row.id,
    name: row.name,
    commissionPct: Number(row.commission_pct ?? 0),
    active: row.active,
    createdAt: row.created_at,
  };
}

function mapLateFeePolicy(row: LateFeePolicyRow): LateFeePolicy {
  return {
    id: row.id,
    name: row.name,
    ruleType: row.rule_type,
    value: Number(row.value ?? 0),
    graceHours: Number(row.grace_hours ?? 0),
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function getSystemSettings() {
  const rows = await supabaseRequest<SettingsRow[]>(
    '/system_settings',
    {
      query: {
        select: 'business_timezone,workday_start,sunday_counts,grace_hours,days_to_writeoff,auto_close_time',
        limit: 1,
      },
    },
    'No fue posible consultar la configuracion del sistema.'
  );

  const row = rows[0];
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se encontro configuracion global del sistema.');
  }

  return mapSettings(row);
}

export async function updateSystemSettings(payload: Partial<SystemSettings>) {
  const body: Record<string, unknown> = {};

  if (payload.businessTimezone) {
    body.business_timezone = payload.businessTimezone.trim();
  }

  if (payload.workdayStart) {
    body.workday_start = payload.workdayStart.trim();
  }

  if (typeof payload.sundayCounts === 'boolean') {
    body.sunday_counts = payload.sundayCounts;
  }

  if (typeof payload.graceHours === 'number') {
    body.grace_hours = payload.graceHours;
  }

  if (typeof payload.daysToWriteoff === 'number') {
    body.days_to_writeoff = payload.daysToWriteoff;
  }

  if (payload.autoCloseTime) {
    body.auto_close_time = payload.autoCloseTime.trim();
  }

  if (Object.keys(body).length === 0) {
    return;
  }

  await supabaseRequest(
    '/system_settings',
    {
      method: 'PATCH',
      query: {
        id: 'eq.true',
      },
      body,
    },
    'No fue posible actualizar la configuracion del sistema.'
  );
}

export async function getTariffs() {
  const rows = await supabaseRequest<TariffRow[]>(
    '/tariffs',
    {
      query: {
        select: 'id,name,commission_pct,active,created_at',
        order: 'created_at.desc',
      },
    },
    'No fue posible consultar tarifas.'
  );

  return rows.map(mapTariff);
}

export async function createTariff(payload: { name: string; commissionPct: number }) {
  const name = payload.name.trim();
  const commissionPct = Number(payload.commissionPct);

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', 'El nombre de la tarifa es obligatorio.');
  }

  if (!Number.isFinite(commissionPct) || commissionPct < 0) {
    throw new ApiError('VALIDATION_ERROR', 'La comision debe ser un numero valido mayor o igual a cero.');
  }

  const inserted = await supabaseRequest<TariffRow[] | TariffRow>(
    '/tariffs',
    {
      method: 'POST',
      query: { select: 'id,name,commission_pct,active,created_at' },
      body: {
        name,
        commission_pct: commissionPct,
        active: true,
      },
      preferRepresentation: true,
    },
    'No fue posible crear la tarifa.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibio la tarifa creada.');
  }

  return mapTariff(row);
}

export async function updateTariffStatus(tariffId: string, active: boolean) {
  if (!tariffId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar la tarifa a actualizar.');
  }

  await supabaseRequest(
    '/tariffs',
    {
      method: 'PATCH',
      query: { id: `eq.${tariffId}` },
      body: { active },
    },
    'No fue posible actualizar la tarifa.'
  );
}

export async function getLateFeePolicies() {
  const rows = await supabaseRequest<LateFeePolicyRow[]>(
    '/late_fee_policies',
    {
      query: {
        select: 'id,name,rule_type,value,grace_hours,active,created_at',
        order: 'created_at.desc',
      },
    },
    'No fue posible consultar politicas de mora.'
  );

  return rows.map(mapLateFeePolicy);
}

export async function createLateFeePolicy(payload: {
  name: string;
  ruleType: LateFeePolicy['ruleType'];
  value: number;
  graceHours: number;
}) {
  const name = payload.name.trim();
  const value = Number(payload.value);
  const graceHours = Number(payload.graceHours);

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', 'El nombre de la politica es obligatorio.');
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError('VALIDATION_ERROR', 'El valor de la politica debe ser un numero valido.');
  }

  if (!Number.isInteger(graceHours) || graceHours < 0 || graceHours > 24) {
    throw new ApiError('VALIDATION_ERROR', 'La gracia en horas debe ser un entero entre 0 y 24.');
  }

  const inserted = await supabaseRequest<LateFeePolicyRow[] | LateFeePolicyRow>(
    '/late_fee_policies',
    {
      method: 'POST',
      query: { select: 'id,name,rule_type,value,grace_hours,active,created_at' },
      body: {
        name,
        rule_type: payload.ruleType,
        value,
        grace_hours: graceHours,
        active: true,
      },
      preferRepresentation: true,
    },
    'No fue posible crear la politica de mora.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibio la politica creada.');
  }

  return mapLateFeePolicy(row);
}

export async function updateLateFeePolicyStatus(policyId: string, active: boolean) {
  if (!policyId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar la politica a actualizar.');
  }

  await supabaseRequest(
    '/late_fee_policies',
    {
      method: 'PATCH',
      query: { id: `eq.${policyId}` },
      body: { active },
    },
    'No fue posible actualizar la politica de mora.'
  );
}
