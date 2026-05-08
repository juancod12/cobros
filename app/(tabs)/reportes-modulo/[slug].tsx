import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { AppShell } from '@/components/ui/app-shell';
import { Card, LinkButton, PageTitle, SectionTitle } from '@/components/ui/ui-kit';
import { ui } from '@/constants/ui';
import { reportesModuleDetails } from '@/data/reportes-modules';

export default function ReportesModuleDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const moduleData = reportesModuleDetails[slug as keyof typeof reportesModuleDetails];

  if (!moduleData) {
    return (
      <AppShell scroll={false}>
        <PageTitle title="Modulo no encontrado" subtitle="La opcion seleccionada no existe o aun no fue configurada." />
      </AppShell>
    );
  }
  const quickLinks = 'quickLinks' in moduleData ? moduleData.quickLinks : undefined;

  return (
    <AppShell>
      <PageTitle title={moduleData.title} subtitle={moduleData.summary} />

      <Card>
        <SectionTitle>Estado actual</SectionTitle>
        <Text
          style={{
            color:
              moduleData.status === 'Implementado'
                ? ui.colors.success
                : moduleData.status === 'En desarrollo'
                  ? ui.colors.warning
                  : ui.colors.textMuted,
            fontWeight: '700',
          }}>
          {moduleData.status}
        </Text>
      </Card>

      {quickLinks?.length ? (
        <Card>
          <SectionTitle>Accesos del modulo</SectionTitle>
          {quickLinks.map((item) => (
            <LinkButton href={item.href} key={item.label}>
              {item.label}
            </LinkButton>
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Siguiente implementacion</SectionTitle>
        {moduleData.nextSteps.map((step) => (
          <Text key={step} style={{ color: ui.colors.textMuted }}>
            - {step}
          </Text>
        ))}
      </Card>
    </AppShell>
  );
}
