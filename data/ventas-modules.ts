import type { LinkProps } from 'expo-router';

export type VentasModuleItem = {
  label: string;
  href: LinkProps['href'];
  moduleSlug?: keyof typeof ventasModuleDetails;
  trailingArrow?: boolean;
};

export const ventasModuleItems: VentasModuleItem[] = [
  {
    label: 'Ingresos / Complementarios',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'ingresos-complementarios' } },
    moduleSlug: 'ingresos-complementarios',
  },
  { label: 'Gastos', href: '/gastos' },
  {
    label: 'Ventas',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'ventas' } },
    moduleSlug: 'ventas',
  },
  {
    label: 'Gestion de caja: Abrir y cerrar',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'gestion-caja' } },
    moduleSlug: 'gestion-caja',
    trailingArrow: true,
  },
  {
    label: 'Resumen',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'resumen' } },
    moduleSlug: 'resumen',
  },
  {
    label: 'Crear llave',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'crear-llave' } },
    moduleSlug: 'crear-llave',
  },
  {
    label: 'Limpieza de cobro',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'limpieza-cobro' } },
    moduleSlug: 'limpieza-cobro',
  },
  {
    label: 'Resumen por periodo',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'resumen-periodo' } },
    moduleSlug: 'resumen-periodo',
  },
  {
    label: 'Apertura masiva de cajas',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'apertura-masiva-cajas' } },
    moduleSlug: 'apertura-masiva-cajas',
  },
  {
    label: 'Transferencia masiva de ventas',
    href: { pathname: '/ventas-modulo/[slug]', params: { slug: 'transferencia-masiva-ventas' } },
    moduleSlug: 'transferencia-masiva-ventas',
  },
];

type VentasModuleDefinition = {
  title: string;
  summary: string;
  status: 'Implementado' | 'En desarrollo' | 'Pendiente';
  nextSteps: string[];
  quickLinks?: { label: string; href: LinkProps['href'] }[];
};

export const ventasModuleDetails = {
  'ingresos-complementarios': {
    title: 'Ingresos / Complementarios',
    summary: 'Registro y conciliacion de ingresos complementarios asociados a ruta, caja y cobrador.',
    status: 'En desarrollo',
    nextSteps: [
      'Definir tipos de ingreso complementario y reglas de validacion.',
      'Relacionar cada ingreso con una sesion de caja abierta.',
      'Integrar evidencias y auditoria por movimiento.',
    ],
    quickLinks: [
      { label: 'Registrar pago', href: '/cobros/payments/new' },
      { label: 'Movimientos de caja', href: '/caja/movements' },
    ],
  },
  ventas: {
    title: 'Ventas',
    summary: 'Operacion diaria de colocacion, seguimiento de cartera y recaudo.',
    status: 'Implementado',
    nextSteps: [
      'Consolidar indicador de conversion por zona.',
      'Agregar metas de ventas por equipo.',
    ],
    quickLinks: [
      { label: 'Clientes', href: '/cobros/clients' },
      { label: 'Prestamos', href: '/cobros/loans' },
      { label: 'Nuevo prestamo', href: '/cobros/loans/new' },
    ],
  },
  'gestion-caja': {
    title: 'Gestion de caja: Abrir y cerrar',
    summary: 'Control de apertura, movimientos y cierre operativo de caja por cobrador.',
    status: 'Implementado',
    nextSteps: [
      'Agregar control de diferencias al cierre.',
      'Emitir comprobante consolidado por sesion.',
    ],
    quickLinks: [
      { label: 'Abrir caja', href: '/caja/open' },
      { label: 'Sesion activa', href: '/caja/session' },
      { label: 'Cerrar caja', href: '/caja/close' },
    ],
  },
  resumen: {
    title: 'Resumen',
    summary: 'Vista resumida de cartera, recaudos y alertas operativas del periodo.',
    status: 'Implementado',
    nextSteps: [
      'Configurar resumen por equipo y por cobrador.',
      'Incluir comparativo contra objetivo diario.',
    ],
    quickLinks: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Reportes', href: '/reportes' },
    ],
  },
  'crear-llave': {
    title: 'Crear llave',
    summary: 'Generacion de llaves operativas para autorizacion de procesos de venta.',
    status: 'Pendiente',
    nextSteps: [
      'Definir politica de expiracion y revocacion de llave.',
      'Registrar auditoria de uso por usuario/dispositivo.',
      'Agregar aprobacion por rol administrador.',
    ],
  },
  'limpieza-cobro': {
    title: 'Limpieza de cobro',
    summary: 'Herramienta para corregir o depurar registros inconsistentes de cobro.',
    status: 'Pendiente',
    nextSteps: [
      'Construir validaciones para detectar duplicados.',
      'Permitir correccion segura con bitacora.',
      'Agregar flujo de aprobacion para cambios criticos.',
    ],
  },
  'resumen-periodo': {
    title: 'Resumen por periodo',
    summary: 'Consolidado por rango de fechas para cartera, recaudo y comportamiento de caja.',
    status: 'En desarrollo',
    nextSteps: [
      'Definir presets semanales y mensuales.',
      'Exportar reporte en PDF/XLSX con filtros.',
      'Agregar comparativo entre periodos.',
    ],
    quickLinks: [{ label: 'Panel de reportes', href: '/reportes-panel' }],
  },
  'apertura-masiva-cajas': {
    title: 'Apertura masiva de cajas',
    summary: 'Apertura simultanea de sesiones de caja para multiples cobradores.',
    status: 'Pendiente',
    nextSteps: [
      'Definir reglas de validacion de saldo inicial por lote.',
      'Agregar reintentos y reporte de errores por cobrador.',
      'Incluir resumen de aperturas procesadas.',
    ],
  },
  'transferencia-masiva-ventas': {
    title: 'Transferencia masiva de ventas',
    summary: 'Reasignacion de cartera/ventas entre cobradores en bloques operativos.',
    status: 'Pendiente',
    nextSteps: [
      'Definir criterios de traspaso (zona, riesgo, saldo).',
      'Simular impacto antes de confirmar transferencia.',
      'Emitir trazabilidad historica por lote.',
    ],
  },
} as const satisfies Record<string, VentasModuleDefinition>;
