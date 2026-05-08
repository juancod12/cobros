export type SubmoduleDefinition = {
  name: string;
  description: string;
  logicFocus: string[];
};

export type ModuleDefinition = {
  id: string;
  name: string;
  objective: string;
  mvpPhase: 'Fase 1';
  submodules: SubmoduleDefinition[];
};

export const modules: ModuleDefinition[] = [
  {
    id: 'core-prestamos-cobros',
    name: 'Core #1 · Préstamos y Cobros',
    objective: 'Administrar clientes, préstamos, cuotas, pagos y estados de cartera.',
    mvpPhase: 'Fase 1',
    submodules: [
      {
        name: 'Clientes',
        description: 'CRUD de clientes, semaforización y calificación.',
        logicFocus: ['Reglas de semáforo de pagos', 'Historial de actividad', 'Validación de documento único'],
      },
      {
        name: 'Préstamos',
        description: 'Creación de préstamo, cálculo de total y generación de cuotas.',
        logicFocus: ['Cálculo de total con interés/tarifa', 'Generación automática de schedule', 'Estados del préstamo'],
      },
      {
        name: 'Cobros/Pagos',
        description: 'Registro de pagos móviles y control de mora.',
        logicFocus: ['Idempotencia por client_payment_uuid', 'Ventana de gracia de 2 horas', 'Domingo no cuenta en mora'],
      },
      {
        name: 'Castigo y multas',
        description: 'Aplicación de políticas por mora y paso a cartera de castigo.',
        logicFocus: ['Castigo > 45 días', 'Políticas configurables de multa', 'Alertas automáticas'],
      },
    ],
  },
  {
    id: 'core-caja-gastos',
    name: 'Core #2 · Caja, Turno y Gastos',
    objective: 'Control operativo-contable diario del cobrador y su cierre de caja.',
    mvpPhase: 'Fase 1',
    submodules: [
      {
        name: 'Apertura de caja',
        description: 'Inicio de turno con saldo inicial.',
        logicFocus: ['Una sola caja abierta por cobrador', 'Registro de hora de apertura', 'Validación de saldo inicial'],
      },
      {
        name: 'Movimientos',
        description: 'Entradas/salidas/ajustes vinculados o no a pagos.',
        logicFocus: ['Trazabilidad por sesión de caja', 'Balance en tiempo real', 'Conciliación con pagos del día'],
      },
      {
        name: 'Gastos de cobrador',
        description: 'Registro de gasolina, alimentación y otros gastos.',
        logicFocus: ['Categorías de gasto', 'Evidencias opcionales', 'Impacto en cierre diario'],
      },
      {
        name: 'Cierre de caja',
        description: 'Cierre manual o automático a las 11:59 PM.',
        logicFocus: ['Auto-cierre programado', 'Resumen diario', 'Diferencias y observaciones'],
      },
    ],
  },
  {
    id: 'transversales',
    name: 'Transversales del MVP',
    objective: 'Capas necesarias para operación, administración y control.',
    mvpPhase: 'Fase 1',
    submodules: [
      {
        name: 'Auth + Usuarios + RBAC',
        description: 'Login, recuperación por admin, roles y permisos.',
        logicFocus: ['Solo admin crea usuarios', 'Permisos por rol', 'Auditoría de cambios sensibles'],
      },
      {
        name: 'Dashboard y KPIs',
        description: 'Vista ejecutiva de cartera, cobros y mora.',
        logicFocus: ['KPIs por cobrador', 'KPIs por estado de cartera', 'Actualización casi en tiempo real'],
      },
      {
        name: 'Notificaciones',
        description: 'Email, WhatsApp, SMS y push para eventos clave.',
        logicFocus: ['Mora e inactividad', 'Clientes en castigo', 'Reintento de envíos fallidos'],
      },
      {
        name: 'Reportes y exportaciones',
        description: 'Reportes PDF/Excel del día y de cartera.',
        logicFocus: ['Cobros diarios por cobrador', 'Cierre de caja', 'Cartera activa vs mora vs castigo'],
      },
    ],
  },
];

export const criticalRules = [
  'Jornada inicia a las 08:00 AM.',
  'Domingo no cuenta como día de mora.',
  'Ventana de gracia de 2 horas entre pagos consecutivos.',
  'Préstamo pasa a castigo al superar 45 días de mora acumulada.',
  'Cierre automático de caja a las 11:59 PM.',
];
