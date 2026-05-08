import { supabaseRequest } from '@/services/http';

export type NotificationFilters = {
  collector?: string;
  from?: string;
  to?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  channel: string;
  createdAt?: string;
};

type NotificationRow = {
  id: string;
  type: string;
  channel: string;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  user?: { full_name: string } | { full_name: string }[] | null;
};

function getUserName(user: NotificationRow['user']) {
  if (!user) return '';
  if (Array.isArray(user)) return user[0]?.full_name ?? '';
  return user.full_name ?? '';
}

function mapNotification(row: NotificationRow): NotificationItem {
  const payload = row.payload ?? {};

  return {
    id: row.id,
    title:
      (typeof payload.title === 'string' && payload.title) ||
      (typeof payload.subject === 'string' && payload.subject) ||
      'Notificación',
    message:
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.body === 'string' && payload.body) ||
      'Sin detalle disponible.',
    read: row.status === 'READ' || row.read_at !== null,
    type: row.type,
    channel: row.channel,
    createdAt: row.created_at,
  };
}

function dateStart(date: string) {
  return `${date}T00:00:00.000Z`;
}

function dateEndExclusive(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

export async function getNotifications(filters: NotificationFilters = {}): Promise<NotificationItem[]> {
  const query: Record<string, string> = {
    select: 'id,type,channel,status,payload,created_at,read_at,user:users(full_name)',
    order: 'created_at.desc',
  };

  const fromIso = filters.from ? dateStart(filters.from) : null;
  const toIsoExclusive = filters.to ? dateEndExclusive(filters.to) : null;

  if (fromIso && toIsoExclusive) {
    query.and = `(created_at.gte.${fromIso},created_at.lt.${toIsoExclusive})`;
  } else if (fromIso) {
    query.created_at = `gte.${fromIso}`;
  } else if (toIsoExclusive) {
    query.created_at = `lt.${toIsoExclusive}`;
  }

  const rows = await supabaseRequest<NotificationRow[]>(
    '/notifications',
    { query },
    'No fue posible cargar notificaciones.'
  );

  const collectorFilter = filters.collector?.trim().toLowerCase();
  const filteredRows = collectorFilter
    ? rows.filter((row) => getUserName(row.user).toLowerCase().includes(collectorFilter))
    : rows;

  return filteredRows.map(mapNotification);
}

export async function markNotificationRead(id: string, read: boolean) {
  if (!id) return;

  await supabaseRequest(
    '/notifications',
    {
      method: 'PATCH',
      query: {
        id: `eq.${id}`,
      },
      body: {
        status: read ? 'READ' : 'PENDING',
        read_at: read ? new Date().toISOString() : null,
      },
    },
    'No fue posible actualizar la notificación.'
  );
}
