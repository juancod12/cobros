import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ApiFeedback } from '@/components/api-feedback';
import { AppShell } from '@/components/ui/app-shell';
import { AppButton, AppInput, Card, Label, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { getNotifications, markNotificationRead } from '@/services/notifications';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

const todayISODate = new Date().toISOString().slice(0, 10);

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const userPermissions = session?.user.permissions ?? [];
  const [collectorFilter, setCollectorFilter] = useState('');
  const [fromDate, setFromDate] = useState(todayISODate);
  const [toDate, setToDate] = useState(todayISODate);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notifications({ collector: collectorFilter || undefined, from: fromDate || undefined, to: toDate || undefined }),
    queryFn: () => getNotifications({ collector: collectorFilter || undefined, from: fromDate || undefined, to: toDate || undefined }),
  });

  const notifications = data ?? [];

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; read: boolean }) => {
      setUpdatingId(payload.id);
      await markNotificationRead(payload.id, payload.read);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications({
          collector: collectorFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      });
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso a notificaciones." />;
  }

  return (
    <AppShell>
      <PageTitle title="Notificaciones" subtitle="Seguimiento de alertas por tipo, canal y lectura." />
      <Card>
        <SectionTitle>Filtros</SectionTitle>
        <Label>Cobrador (opcional)</Label>
        <AppInput value={collectorFilter} onChangeText={setCollectorFilter} autoCapitalize="none" />
        <Label>Fecha desde (YYYY-MM-DD)</Label>
        <AppInput value={fromDate} onChangeText={setFromDate} autoCapitalize="none" />
        <Label>Fecha hasta (YYYY-MM-DD)</Label>
        <AppInput value={toDate} onChangeText={setToDate} autoCapitalize="none" />
        <AppButton label="Actualizar listado" variant="secondary" onPress={() => void refetch()} />
      </Card>
      <ApiFeedback isLoading={isLoading} error={error ? toApiError(error, 'No fue posible cargar notificaciones.').message : null} />
      <Card>
        {notifications.length === 0 ? <Text style={{ color: ui.colors.textMuted }}>No hay notificaciones para el rango seleccionado.</Text> : null}
        {notifications.map((notification) => (
          <Card key={notification.id} style={{ backgroundColor: ui.colors.surfaceMuted }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: ui.colors.text, fontWeight: '700', flex: 1 }}>{notification.title}</Text>
              <Text style={{ color: notification.read ? ui.colors.success : ui.colors.danger, fontWeight: '700' }}>
                {notification.read ? 'Leido' : 'No leido'}
              </Text>
            </View>
            <Text style={{ color: ui.colors.textMuted }}>{notification.message}</Text>
            <Text style={{ color: ui.colors.textMuted, fontSize: 12 }}>Tipo: {notification.type}</Text>
            <Text style={{ color: ui.colors.textMuted, fontSize: 12 }}>Canal: {notification.channel}</Text>
            <AppButton
              label={notification.read ? 'Marcar como no leido' : 'Marcar como leido'}
              variant="secondary"
              onPress={() => mutation.mutate({ id: notification.id, read: !notification.read })}
              disabled={mutation.isPending && updatingId === notification.id}
            />
          </Card>
        ))}
      </Card>
    </AppShell>
  );
}
