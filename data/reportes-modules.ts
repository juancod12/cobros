import type { LinkProps } from 'expo-router';

export type ReportesModuleItem = {
  label: string;
  href: LinkProps['href'];
  moduleSlug?: keyof typeof reportesModuleDetails;
};

type ReportesModuleDefinition = {
  title: string;
  summary: string;
  status: 'Implementado' | 'En desarrollo' | 'Pendiente';
  nextSteps: string[];
  quickLinks?: { label: string; href: LinkProps['href'] }[];
};

export const reportesModuleItems: ReportesModuleItem[] = [
  {
    label: 'Ventas',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'ventas' } },
    moduleSlug: 'ventas',
  },
  {
    label: 'Procesos encolados',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'procesos-encolados' } },
    moduleSlug: 'procesos-encolados',
  },
  {
    label: 'Log de Acciones',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'log-acciones' } },
    moduleSlug: 'log-acciones',
  },
  {
    label: 'Log Movil',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'log-movil' } },
    moduleSlug: 'log-movil',
  },
  {
    label: 'Reportes Personalizados',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'reportes-personalizados' } },
    moduleSlug: 'reportes-personalizados',
  },
  {
    label: 'Ubicar Mis Trabajadores',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'ubicar-trabajadores' } },
    moduleSlug: 'ubicar-trabajadores',
  },
  {
    label: 'Reportes Rapidos',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'reportes-rapidos' } },
    moduleSlug: 'reportes-rapidos',
  },
  {
    label: 'Reporte Dispositivos Vinculados',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'dispositivos-vinculados' } },
    moduleSlug: 'dispositivos-vinculados',
  },
  {
    label: 'Historico de alertas de panico',
    href: { pathname: '/reportes-modulo/[slug]', params: { slug: 'historico-alertas-panico' } },
    moduleSlug: 'historico-alertas-panico',
  },
];

export const reportesModulesMoreHref: LinkProps['href'] = '/reportes-panel';

export const reportesModuleDetails = {
  ventas: {
    title: 'Reporte de Ventas',
    summary: 'Consolidado de ventas por rango de fechas, unidad, cobrador y estado.',
    status: 'Implementado',
    nextSteps: [
      'Agregar comparativo diario/semanal/mensual.',
      'Permitir exportacion con filtros avanzados.',
    ],
    quickLinks: [{ label: 'Panel de reportes', href: '/reportes-panel' }],
  },
  'procesos-encolados': {
    title: 'Procesos encolados',
    summary: 'Seguimiento de procesos pendientes en cola y su estado de ejecucion.',
    status: 'En desarrollo',
    nextSteps: [
      'Agregar reintento manual por proceso.',
      'Registrar causa de error y tiempo de espera.',
      'Incluir alertas de saturacion.',
    ],
  },
  'log-acciones': {
    title: 'Log de Acciones',
    summary: 'Auditoria de acciones criticas realizadas en la plataforma.',
    status: 'En desarrollo',
    nextSteps: [
      'Agregar filtros por usuario y modulo.',
      'Permitir exportacion por rango de fechas.',
      'Mostrar detalle del contexto de cada accion.',
    ],
  },
  'log-movil': {
    title: 'Log Movil',
    summary: 'Registro de eventos enviados desde dispositivos moviles.',
    status: 'Pendiente',
    nextSteps: [
      'Consolidar eventos por version de app.',
      'Agregar trazabilidad por dispositivo.',
      'Incluir panel de fallas de sincronizacion.',
    ],
  },
  'reportes-personalizados': {
    title: 'Reportes Personalizados',
    summary: 'Constructor de reportes con filtros y columnas configurables.',
    status: 'Pendiente',
    nextSteps: [
      'Definir plantillas reutilizables.',
      'Guardar filtros por usuario.',
      'Habilitar exportacion programada.',
    ],
  },
  'ubicar-trabajadores': {
    title: 'Ubicar Mis Trabajadores',
    summary: 'Consulta de ubicacion y actividad de trabajadores en campo.',
    status: 'En desarrollo',
    nextSteps: [
      'Mostrar ultima posicion reportada.',
      'Agregar filtro por unidad y estado.',
      'Incluir historial de recorridos.',
    ],
  },
  'reportes-rapidos': {
    title: 'Reportes Rapidos',
    summary: 'Acceso directo a reportes operativos frecuentes del dia.',
    status: 'Implementado',
    nextSteps: [
      'Agregar favoritos por usuario.',
      'Habilitar descarga directa en un clic.',
    ],
  },
  'dispositivos-vinculados': {
    title: 'Reporte Dispositivos Vinculados',
    summary: 'Listado de dispositivos asociados a usuarios y su estado operativo.',
    status: 'Pendiente',
    nextSteps: [
      'Agregar estado de sincronizacion y version.',
      'Mostrar historico de vinculaciones.',
      'Permitir exportacion por unidad.',
    ],
  },
  'historico-alertas-panico': {
    title: 'Historico de alertas de panico',
    summary: 'Consulta historica de alertas de panico con detalle de atencion.',
    status: 'En desarrollo',
    nextSteps: [
      'Clasificar alertas por severidad y estado.',
      'Relacionar alerta con evidencia de respuesta.',
      'Agregar reporte por tiempo de atencion.',
    ],
  },
} as const satisfies Record<string, ReportesModuleDefinition>;
