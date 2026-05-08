import { supabaseRequest } from '@/services/http';
import { getAuthSession } from '@/store/auth-store';
import { ApiError } from '@/types/api-error';

export type PortfolioStatus = 'al_dia' | 'riesgo' | 'moroso' | 'castigo';

export type Client = {
  id: string;
  uuid?: string;
  document: string;
  name: string;
  contact: string;
  score: number;
  collectorId?: string;
  collectorName?: string;
  portfolioStatus?: PortfolioStatus;
};

export type ClientPayload = {
  document: string;
  name: string;
  contact: string;
  score: number;
};

type QueryFilters = {
  status?: string;
  collector?: string;
  search?: string;
};

type ClientTrafficLight = 'AL_DIA' | 'EN_RIESGO' | 'MOROSO' | 'CASTIGO';

type CollectorRef = {
  id: string;
  full_name: string;
};

type ClientRow = {
  id: string;
  document_number: string;
  full_name: string;
  phone: string | null;
  score: number | null;
  traffic_light: ClientTrafficLight;
  assigned_collector_id: string | null;
  collector?: CollectorRef | CollectorRef[] | null;
};

const CLIENT_SELECT =
  'id,document_number,full_name,phone,score,traffic_light,assigned_collector_id,collector:users!clients_assigned_collector_id_fkey(id,full_name)';

function getCollector(collector: ClientRow['collector']) {
  if (!collector) {
    return undefined;
  }

  if (Array.isArray(collector)) {
    return collector[0];
  }

  return collector;
}

function trafficLightToPortfolioStatus(value: ClientTrafficLight): PortfolioStatus {
  if (value === 'AL_DIA') return 'al_dia';
  if (value === 'EN_RIESGO') return 'riesgo';
  if (value === 'MOROSO') return 'moroso';
  return 'castigo';
}

function statusToTrafficLight(value?: string): ClientTrafficLight | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'al_dia') return 'AL_DIA';
  if (normalized === 'riesgo') return 'EN_RIESGO';
  if (normalized === 'moroso') return 'MOROSO';
  if (normalized === 'castigo') return 'CASTIGO';
  return null;
}

function scoreToTrafficLight(score: number): ClientTrafficLight {
  if (score >= 700) return 'AL_DIA';
  if (score >= 550) return 'EN_RIESGO';
  if (score >= 450) return 'MOROSO';
  return 'CASTIGO';
}

function mapClient(row: ClientRow): Client {
  const collector = getCollector(row.collector);

  return {
    id: row.id,
    document: row.document_number,
    name: row.full_name,
    contact: row.phone ?? '',
    score: row.score ?? 0,
    collectorId: row.assigned_collector_id ?? collector?.id,
    collectorName: collector?.full_name,
    portfolioStatus: trafficLightToPortfolioStatus(row.traffic_light),
  };
}

export async function getClients(filters: QueryFilters = {}) {
  const query: Record<string, string> = {
    select: CLIENT_SELECT,
    order: 'created_at.desc',
  };

  const trafficLight = statusToTrafficLight(filters.status);
  if (trafficLight) {
    query.traffic_light = `eq.${trafficLight}`;
  }

  const rows = await supabaseRequest<ClientRow[]>('/clients', { query }, 'No fue posible cargar clientes.');
  let clients = rows.map(mapClient);

  if (filters.collector) {
    const collectorFilter = filters.collector.toLowerCase();
    clients = clients.filter((client) => client.collectorName?.toLowerCase().includes(collectorFilter));
  }

  if (filters.search) {
    const search = filters.search.trim().toLowerCase();
    clients = clients.filter((client) => {
      if (client.id.toLowerCase().includes(search)) {
        return true;
      }

      if (client.document.toLowerCase().includes(search)) {
        return true;
      }

      if (client.name.toLowerCase().includes(search)) {
        return true;
      }

      return false;
    });
  }

  return clients;
}

export async function getClientById(id: string) {
  if (!id) {
    throw new ApiError('VALIDATION_ERROR', 'Debes indicar el id del cliente.');
  }

  const rows = await supabaseRequest<ClientRow[]>(
    '/clients',
    {
      query: {
        select: CLIENT_SELECT,
        id: `eq.${id}`,
        limit: 1,
      },
    },
    'No fue posible cargar el cliente.'
  );

  const row = rows[0];
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se encontró el cliente solicitado.', 404);
  }

  return mapClient(row);
}

export async function createClient(payload: ClientPayload) {
  const document = payload.document.trim();
  const name = payload.name.trim();
  const score = Number(payload.score);

  if (!document || !name) {
    throw new ApiError('VALIDATION_ERROR', 'Documento y nombre son obligatorios.');
  }

  if (!Number.isFinite(score) || score < 0) {
    throw new ApiError('VALIDATION_ERROR', 'El score debe ser un número válido.');
  }

  const inserted = await supabaseRequest<ClientRow[] | ClientRow>(
    '/clients',
    {
      method: 'POST',
      query: { select: CLIENT_SELECT },
      body: {
        document_number: document,
        full_name: name,
        phone: payload.contact.trim() || null,
        score,
        traffic_light: scoreToTrafficLight(score),
        status: 'ACTIVE',
        assigned_collector_id: getAuthSession()?.user.id ?? null,
      },
      preferRepresentation: true,
    },
    'No fue posible crear el cliente.'
  );

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  if (!row) {
    throw new ApiError('UNKNOWN', 'No se recibió el cliente creado.');
  }

  return mapClient(row);
}
