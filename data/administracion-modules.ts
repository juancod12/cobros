import type { LinkProps } from 'expo-router';

export type AdministracionSubmoduleItem = {
  label: string;
  href: LinkProps['href'];
  moduleSlug: keyof typeof administracionModuleDetails;
};

export type AdministracionSectionItem = {
  id: string;
  label: string;
  items: AdministracionSubmoduleItem[];
  trailingArrow?: boolean;
};

type AdministracionModuleDefinition = {
  title: string;
  summary: string;
  status: 'Implementado' | 'En desarrollo' | 'Pendiente';
  nextSteps: string[];
  quickLinks?: { label: string; href: LinkProps['href'] }[];
};

function toModuleHref(slug: keyof typeof administracionModuleDetails): LinkProps['href'] {
  return { pathname: '/administracion-modulo/[slug]', params: { slug } };
}

export const administracionModuleDetails = {
  unidades: {
    title: 'Unidades',
    summary: 'Configuracion y control operativo de unidades asociadas a la plataforma.',
    status: 'En desarrollo',
    nextSteps: [
      'Definir alta, edicion y baja logica por unidad.',
      'Relacionar unidad con zona, sociedad y responsables.',
      'Agregar trazabilidad de cambios administrativos.',
    ],
    quickLinks: [{ label: 'Dashboard', href: '/' }],
  },
  trabajadores: {
    title: 'Trabajadores',
    summary: 'Gestion del personal operativo y administrativo dentro del sistema.',
    status: 'Pendiente',
    nextSteps: [
      'Definir estructura de cargos y jerarquias.',
      'Asignar trabajador a unidad y permisos base.',
      'Registrar historial laboral y estado activo/inactivo.',
    ],
    quickLinks: [{ label: 'Usuarios', href: '/usuarios' }],
  },
  'tipos-movimientos': {
    title: 'Tipos de movimientos',
    summary: 'Catalogo de movimientos para caja, recaudo y ajustes operativos.',
    status: 'En desarrollo',
    nextSteps: [
      'Separar movimientos contables vs operativos.',
      'Configurar reglas de validacion por tipo.',
      'Habilitar parametrizacion por sociedad.',
    ],
  },
  dispositivos: {
    title: 'Dispositivos',
    summary: 'Administracion de dispositivos autorizados para operar en campo.',
    status: 'Pendiente',
    nextSteps: [
      'Registrar inventario y asignacion por usuario.',
      'Controlar bloqueo remoto por riesgo.',
      'Mostrar estado de sincronizacion por dispositivo.',
    ],
  },
  'liquidacion-trabajador': {
    title: 'Liquidacion del trabajador',
    summary: 'Proceso de cierre y liquidacion de responsabilidades operativas por trabajador.',
    status: 'Pendiente',
    nextSteps: [
      'Definir reglas de calculo de liquidacion.',
      'Cruzar cartera, caja y novedades.',
      'Emitir comprobante y aprobacion final.',
    ],
    quickLinks: [{ label: 'Panel de reportes', href: '/reportes-panel' }],
  },
  usuarios: {
    title: 'Gestion de Usuarios',
    summary: 'Creacion, activacion y control de acceso de usuarios del sistema.',
    status: 'Implementado',
    nextSteps: [
      'Agregar filtros avanzados por rol y estado.',
      'Registrar bitacora de cambios de permisos.',
    ],
    quickLinks: [{ label: 'Usuarios', href: '/usuarios' }],
  },
  perfiles: {
    title: 'Perfiles',
    summary: 'Configuracion de perfiles funcionales para definir alcance operativo por tipo de usuario.',
    status: 'En desarrollo',
    nextSteps: [
      'Definir perfil base por area operativa.',
      'Relacionar perfil con permisos heredados.',
      'Permitir clonacion de perfiles para despliegue rapido.',
    ],
    quickLinks: [{ label: 'Roles', href: '/roles' }],
  },
  'asignacion-unidades': {
    title: 'Asignacion de unidades',
    summary: 'Asignacion de usuarios a unidades para operar por zona y estructura organizacional.',
    status: 'Pendiente',
    nextSteps: [
      'Definir reglas de asignacion multiple por usuario.',
      'Validar conflictos de cobertura entre unidades.',
      'Registrar historial de cambios de asignacion.',
    ],
    quickLinks: [{ label: 'Usuarios', href: '/usuarios' }],
  },
  'roles-permisos': {
    title: 'Roles y permisos',
    summary: 'Administracion centralizada de roles, permisos y alcance funcional.',
    status: 'Implementado',
    nextSteps: [
      'Agregar plantillas de roles por tipo de negocio.',
      'Permitir clonado de configuraciones de rol.',
    ],
    quickLinks: [{ label: 'Roles', href: '/roles' }],
  },
  'auditoria-accesos': {
    title: 'Auditoria de accesos',
    summary: 'Monitoreo de accesos y eventos de seguridad por usuario y dispositivo.',
    status: 'En desarrollo',
    nextSteps: [
      'Registrar intentos fallidos y bloqueos.',
      'Generar alertas por actividad sospechosa.',
      'Exportar auditoria por rango de fechas.',
    ],
    quickLinks: [{ label: 'Notificaciones', href: '/notifications' }],
  },
  clientes: {
    title: 'Gestion de Clientes',
    summary: 'Mantenimiento de informacion maestra de clientes y estado operativo.',
    status: 'Implementado',
    nextSteps: [
      'Agregar validaciones de calidad de datos.',
      'Consolidar alertas de duplicidad y riesgo.',
    ],
    quickLinks: [{ label: 'Clientes', href: '/cobros/clients' }],
  },
  'actividad-economica': {
    title: 'Actividad economica',
    summary: 'Catalogo de actividades economicas asociadas a clientes y evaluacion operativa.',
    status: 'Pendiente',
    nextSteps: [
      'Definir codificacion y jerarquia de actividades.',
      'Relacionar actividad economica con perfil de riesgo.',
      'Incluir filtros de cartera por actividad.',
    ],
  },
  'lista-negra': {
    title: 'Lista negra',
    summary: 'Control de bloqueos temporales o permanentes para operaciones con clientes.',
    status: 'Pendiente',
    nextSteps: [
      'Definir motivos y niveles de bloqueo.',
      'Agregar flujo de aprobacion para desbloqueo.',
      'Notificar bloqueo a modulos dependientes.',
    ],
  },
} as const satisfies Record<string, AdministracionModuleDefinition>;

export const administracionModuleSections: AdministracionSectionItem[] = [
  {
    id: 'gestion-plataforma',
    label: 'Gestion de Plataforma',
    trailingArrow: true,
    items: [
      { label: 'Unidades', href: toModuleHref('unidades'), moduleSlug: 'unidades' },
      { label: 'Trabajadores', href: toModuleHref('trabajadores'), moduleSlug: 'trabajadores' },
      {
        label: 'Tipos de movimientos',
        href: toModuleHref('tipos-movimientos'),
        moduleSlug: 'tipos-movimientos',
      },
      { label: 'Dispositivos', href: toModuleHref('dispositivos'), moduleSlug: 'dispositivos' },
      {
        label: 'Liquidacion del trabajador',
        href: toModuleHref('liquidacion-trabajador'),
        moduleSlug: 'liquidacion-trabajador',
      },
    ],
  },
  {
    id: 'gestion-usuarios',
    label: 'Gestion de Usuarios',
    trailingArrow: true,
    items: [
      { label: 'Perfiles', href: toModuleHref('perfiles'), moduleSlug: 'perfiles' },
      { label: 'Usuarios', href: toModuleHref('usuarios'), moduleSlug: 'usuarios' },
      { label: 'Asignacion de unidades', href: toModuleHref('asignacion-unidades'), moduleSlug: 'asignacion-unidades' },
    ],
  },
  {
    id: 'gestion-clientes',
    label: 'Gestion de Clientes',
    trailingArrow: true,
    items: [
      {
        label: 'Actividad economica',
        href: toModuleHref('actividad-economica'),
        moduleSlug: 'actividad-economica',
      },
      { label: 'Clientes', href: toModuleHref('clientes'), moduleSlug: 'clientes' },
      {
        label: 'Lista negra',
        href: toModuleHref('lista-negra'),
        moduleSlug: 'lista-negra',
      },
    ],
  },
];

export const administracionDefaultSectionId = administracionModuleSections[0]?.id ?? '';
export const administracionModulesMoreHref: LinkProps['href'] = '/administracion';
