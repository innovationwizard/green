// Spanish translations for GREENTELLIGENCE
export const translations = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    finish: 'Finalizar',
    noData: 'No hay datos aún',
  },
  events: {
    materialAdded: 'Material Agregado',
    materialReturnedWarehouse: 'Material Devuelto a Almacén',
    materialReturnedProject: 'Material Devuelto a Proyecto',
    expenseLogged: 'Gasto Registrado',
    laborLogged: 'Mano de Obra',
    subcontractorCost: 'Subcontratista',
    changeOrderAdded: 'Orden de Cambio',
    clientInvoiceIssued: 'Factura Emitida',
    clientPaymentReceived: 'Pago Recibido',
    vendorBillReceived: 'Factura de Proveedor',
    vendorPaymentMade: 'Pago a Proveedor',
    cashAdvanceIssued: 'Adelanto de Efectivo',
    reimbursementIssued: 'Reembolso',
    creditPurchaseRecorded: 'Compra a Crédito',
    clientRefundIssued: 'Reembolso a Cliente',
    vendorRefundReceived: 'Reembolso de Proveedor',
    projectStatusChanged: 'Cambio de Estado',
    eventReversed: 'Evento Revertido',
  },
  installer: {
    myEvents: 'Mis Eventos',
    newEvent: 'Nuevo Evento',
    timer: 'Temporizador',
    cashBox: 'Mi Caja',
    sync: 'Sincronizar',
    balance: 'Balance Actual',
    lastMovements: 'Últimos Movimientos',
    syncStatus: 'Estado de Sincronización',
    pendingEvents: 'Eventos pendientes',
    lastSync: 'Última sincronización',
    syncNow: 'Sincronizar Ahora',
    anular: 'Anular',
    cannotAnular: 'Ya no puedes anular este evento. El plazo venció el sábado a las 23:59.',
  },
  admin: {
    dashboards: 'Dashboards',
    projects: 'Proyectos',
    items: 'Items',
    clients: 'Clientes',
    users: 'Usuarios',
    laborRates: 'Tarifas',
    quotes: 'Cotizaciones',
    exceptions: 'Excepciones',
    audit: 'Auditoría',
    onboarding: 'Configuración',
    importQuote: 'Importar Cotización',
    exportAudit: 'Exportar Auditoría',
    duplicateEvents: 'Eventos Duplicados',
    omissionWarnings: 'Alertas de Omisión',
  },
  dashboards: {
    executiveSummary: 'Resumen Ejecutivo',
    unitEconomics: 'Economía Unitaria por Proyecto',
    salesPipeline: 'Velocidad del Pipeline de Ventas',
    cashFlow: 'Flujo de Caja y Capital de Trabajo',
    totalRevenue: 'Ingresos Totales',
    totalCosts: 'Costos Totales',
    netProfit: 'Utilidad Neta',
    netProfitMargin: 'Margen de Utilidad Neta',
  },
  forms: {
    selectProject: 'Selecciona un proyecto',
    selectEventType: 'Selecciona un tipo',
    required: 'Campo requerido',
    invalidEmail: 'Email inválido',
    invalidNumber: 'Número inválido',
  },
}

export function t(key: string): string {
  const keys = key.split('.')
  let value: unknown = translations
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key
    }
  }
  return typeof value === 'string' ? value : key
}

