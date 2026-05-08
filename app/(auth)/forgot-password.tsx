import { Link } from 'expo-router';
import { Text } from 'react-native';

import { AppShell } from '@/components/ui/app-shell';
import { Card, PageTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';

export default function ForgotPasswordScreen() {
  return (
    <AppShell scroll={false}>
      <PageTitle title="Recuperar contrasena" subtitle="Proceso asistido por administracion." />
      <Card>
        <Text style={{ color: ui.colors.textMuted }}>
          Por politicas de seguridad, la recuperacion de contrasena es gestionada por un administrador.
        </Text>
        <Text style={{ color: ui.colors.textMuted }}>
          Contacta al equipo admin y comparte tu correo corporativo para continuar.
        </Text>
        <Link style={{ color: ui.colors.primary, fontWeight: '700' }} href="/(auth)/login">
          Volver a iniciar sesion
        </Link>
      </Card>
    </AppShell>
  );
}
