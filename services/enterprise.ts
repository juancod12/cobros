import { supabaseRequest } from '@/services/http';
import { ApiError } from '@/types/api-error';

export type Company = {
  id: string;
  name: string;
  legalId: string;
  active: boolean;
  createdAt: string;
};

export type Branch = {
  id: string;
  companyId: string;
  companyName?: string;
  name: string;
  code?: string;
  address?: string;
  active: boolean;
  createdAt: string;
};

type CompanyRow = {
  id: string;
  name: string;
  legal_id: string;
  active: boolean;
  created_at: string;
};

type BranchRow = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address: string | null;
  active: boolean;
  created_at: string;
  company?: { name: string } | { name: string }[] | null;
};

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    legalId: row.legal_id,
    active: row.active,
    createdAt: row.created_at,
  };
}

function getCompanyName(relation: BranchRow['company']) {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0]?.name;
  return relation.name;
}

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: getCompanyName(row.company),
    name: row.name,
    code: row.code ?? undefined,
    address: row.address ?? undefined,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function getCompanies() {
  const rows = await supabaseRequest<CompanyRow[]>(
    '/companies',
    {
      query: {
        select: 'id,name,legal_id,active,created_at',
        order: 'created_at.asc',
      },
    },
    'No fue posible consultar empresas.'
  );

  return rows.map(mapCompany);
}

export async function createCompany(payload: { name: string; legalId: string }) {
  const name = payload.name.trim();
  const legalId = payload.legalId.trim();

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', 'El nombre de la empresa es obligatorio.');
  }

  if (!legalId) {
    throw new ApiError('VALIDATION_ERROR', 'El NIT/identificacion legal de la empresa es obligatorio.');
  }

  const inserted = await supabaseRequest<CompanyRow[] | CompanyRow>(
    '/companies',
    {
      method: 'POST',
      query: { select: 'id,name,legal_id,active,created_at' },
      body: {
        name,
        legal_id: legalId,
        active: true,
      },
      preferRepresentation: true,
    },
    'No fue posible crear la empresa.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibio la empresa creada.');
  }

  return mapCompany(row);
}

export async function updateCompanyStatus(companyId: string, active: boolean) {
  if (!companyId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar la empresa a actualizar.');
  }

  await supabaseRequest(
    '/companies',
    {
      method: 'PATCH',
      query: { id: `eq.${companyId}` },
      body: { active },
    },
    'No fue posible actualizar la empresa.'
  );
}

export async function getBranches(companyId?: string) {
  const query: Record<string, string> = {
    select: 'id,company_id,name,code,address,active,created_at,company:companies!branches_company_id_fkey(name)',
    order: 'created_at.asc',
  };

  if (companyId) {
    query.company_id = `eq.${companyId}`;
  }

  const rows = await supabaseRequest<BranchRow[]>(
    '/branches',
    { query },
    'No fue posible consultar sucursales.'
  );

  return rows.map(mapBranch);
}

export async function createBranch(payload: {
  companyId: string;
  name: string;
  code?: string;
  address?: string;
}) {
  const companyId = payload.companyId.trim();
  const name = payload.name.trim();

  if (!companyId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar la empresa de la sucursal.');
  }

  if (!name) {
    throw new ApiError('VALIDATION_ERROR', 'El nombre de la sucursal es obligatorio.');
  }

  const inserted = await supabaseRequest<BranchRow[] | BranchRow>(
    '/branches',
    {
      method: 'POST',
      query: { select: 'id,company_id,name,code,address,active,created_at,company:companies!branches_company_id_fkey(name)' },
      body: {
        company_id: companyId,
        name,
        code: payload.code?.trim() || null,
        address: payload.address?.trim() || null,
        active: true,
      },
      preferRepresentation: true,
    },
    'No fue posible crear la sucursal.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibio la sucursal creada.');
  }

  return mapBranch(row);
}

export async function updateBranchStatus(branchId: string, active: boolean) {
  if (!branchId) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar la sucursal a actualizar.');
  }

  await supabaseRequest(
    '/branches',
    {
      method: 'PATCH',
      query: { id: `eq.${branchId}` },
      body: { active },
    },
    'No fue posible actualizar la sucursal.'
  );
}
