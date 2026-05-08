import type { LinkProps } from 'expo-router';

export type GeneralModuleItem = {
  label: string;
  href: LinkProps['href'];
  moduleSlug?: keyof typeof generalModuleDetails;
  trailingArrow?: boolean;
};

type GeneralModuleDefinition = {
  title: string;
  summary: string;
  status: 'Implementado' | 'En desarrollo' | 'Pendiente';
  nextSteps: string[];
  quickLinks?: { label: string; href: LinkProps['href'] }[];
};

export const generalModuleItems: GeneralModuleItem[] = [
  {
    label: 'Mapa',
    href: { pathname: '/general-modulo/[slug]', params: { slug: 'mapa' } },
    moduleSlug: 'mapa',
  },
  {
    label: 'Facturacion',
    href: { pathname: '/general-modulo/[slug]', params: { slug: 'facturacion' } },
    moduleSlug: 'facturacion',
  },
  {
    label: 'Aprobaciones',
    href: { pathname: '/general-modulo/[slug]', params: { slug: 'aprobaciones' } },
    moduleSlug: 'aprobaciones',
  },
  {
    label: 'Seguros',
    href: { pathname: '/general-modulo/[slug]', params: { slug: 'seguros' } },
    moduleSlug: 'seguros',
  },
];

export const generalModulesMoreHref: LinkProps['href'] = '/general';

export const generalModuleDetails = {
  mapa: {
    title: 'Mapa',
    summary: 'Vista territorial para ubicacion de unidades, cobradores y actividad operativa.',
    status: 'Implementado',
    nextSteps: [
      'Agregar filtros por zona, unidad y responsable.',
      'Mostrar estados de caja y sincronizacion en tiempo real.',
      'Permitir navegacion rapida hacia detalle por unidad.',
    ],
    quickLinks: [
      { label: 'Dashboard', href: '/' },
      { label: 'Reportes', href: '/reportes-panel' },
    ],
  },
  facturacion: {
    title: 'Facturacion',
    summary: 'Gestion de comprobantes y control del ciclo de facturacion por periodo.',
    status: 'Pendiente',
    nextSteps: [
      'Definir flujo de emision y anulacion con auditoria.',
      'Configurar reglas de numeracion por sociedad.',
      'Habilitar exportacion e integracion contable.',
    ],
  },
  aprobaciones: {
    title: 'Aprobaciones',
    summary: 'Bandeja para validar solicitudes operativas que requieren autorizacion.',
    status: 'En desarrollo',
    nextSteps: [
      'Configurar tipos de solicitud y niveles de aprobacion.',
      'Agregar firma de aprobacion por rol.',
      'Crear historial de decisiones por usuario.',
    ],
    quickLinks: [{ label: 'Notificaciones', href: '/notifications' }],
  },
  seguros: {
    title: 'Seguros',
    summary: 'Control de cobertura y vigencia de seguros asociados a cartera y operacion.',
    status: 'Pendiente',
    nextSteps: [
      'Definir catalogo de polizas y coberturas.',
      'Relacionar seguro con cliente y producto.',
      'Generar alertas por vencimiento.',
    ],
  },
} as const satisfies Record<string, GeneralModuleDefinition>;
