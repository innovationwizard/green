# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

## [Unreleased] - 2024

### Cambiado

#### Refactor: Sistema de Órdenes de Compra → Sistema de Órdenes de Venta

- **Renombramiento Completo del Sistema**:
  - Tablas de base de datos: `purchase_orders` → `sales_orders`, `purchase_order_items` → `sales_order_items`
  - Columna: `purchase_order_id` → `sales_order_id`
  - Rutas de API: `/api/purchase-orders/` → `/api/sales-orders/`
  - Rutas de UI: `/admin/projects/[id]/purchase-orders` → `/admin/projects/[id]/sales-orders`
  - Tipos TypeScript: `ParsedPurchaseOrder` → `ParsedSalesOrder`, `CreatePurchaseOrderRequest` → `CreateSalesOrderRequest`
  - Variables y funciones: `purchaseOrder` → `salesOrder`, `loadPurchaseOrders()` → `loadSalesOrders()`
  - Migración de base de datos creada: `007_rename_purchase_orders_to_sales_orders.sql`
  - Actualización completa de documentación y tipos de base de datos

**Razón del cambio**: El sistema maneja órdenes de venta (lo que Green vende a clientes), no órdenes de compra (lo que Green compra a proveedores). La terminología ahora refleja correctamente el propósito del sistema.

### Agregado

#### Sistema de Órdenes de Venta (Sales Orders) - Mejoras de Extracción PDF

- **Mejoras en Extracción de PDF de Órdenes de Venta**:
  - Extracción mejorada del número de orden (PO number) - detecta patrones como "Pedido de cliente 2657"
  - Extracción mejorada de fechas (emisión y entrega) - maneja formato DD/MM/YYYY de Guatemala
  - Extracción mejorada de totales - maneja prefijos de moneda "QTZ" y "Q"
  - Extracción mejorada de vendedor/salesperson - detecta "Empleado del departamento de ventas"
  - Parsing mejorado de tabla de items - detecta correctamente columnas: #, Número de artículo, Descripción, Unidad, Cantidad, Precio, Total
  - Manejo robusto de prefijos de moneda en precios y totales
  - Validación mejorada de items extraídos (filtra headers, totales, etc.)
  - Soporte para múltiples formatos de tabla y fallback parsing

- **Corrección en Extracción de Vendor**:
  - Corregido: El campo "Para" ahora se reconoce correctamente como cliente/customer, NO como vendor
  - Vendor (proveedor) solo se extrae cuando hay etiquetas explícitas (Proveedor, Supplier, Vendedor)
  - Vendor field históricamente no usado y será valioso para tracking de proveedores
  - Se espera que vendor esté vacío/undefined en muchos casos (comportamiento esperado)

- **Manejo de Campos Requeridos Faltantes**:
  - UI mejorada para manejar campos requeridos faltantes (po_number, issue_date, total)
  - Campos editables aparecen cuando faltan datos del PDF
  - Validación client-side antes de importar
  - Fecha de emisión por defecto a fecha actual si falta

### Cambiado

#### Landing Pages por Rol (Mejores Prácticas de la Industria)

- **DEV Landing Page** (`/dev`):
  - Dashboard de desarrollador con monitoreo de salud del sistema
  - Métricas en tiempo real: usuarios activos, eventos, excepciones, proyecciones, sincronización
  - Acceso rápido a todas las interfaces (Admin, Manager, Installer)
  - Herramientas de soporte y debugging
  - Auto-refresh cada 30 segundos
  - Ruta top-level separada (no anidada bajo `/admin`)

- **MANAGER Landing Page** (`/manager/dashboards`):
  - Resumen ejecutivo con KPIs a primera vista (últimos 30 días)
  - Métricas clave: Ingresos totales, Costos totales, Utilidad neta, Margen de utilidad
  - Acceso rápido a dashboards detallados
  - Auto-refresh cada 5 minutos
  - Optimizado para toma de decisiones ejecutivas

- **ADMIN Landing Page** (`/admin/dashboards`):
  - Panel administrativo con métricas operacionales
  - Cola de trabajo: Excepciones pendientes, eventos recientes, proyectos totales
  - Acciones rápidas: Centro de excepciones, importación, exportación, proyecciones, configuración
  - Indicadores visuales de trabajo pendiente (badges)
  - Auto-refresh cada 2 minutos
  - Optimizado para personal administrativo/contabilidad

- **INSTALLER Landing Page** (`/installer/eventos`):
  - Dashboard de campo con estado de sincronización
  - Balance de caja a primera vista con advertencias de balance negativo
  - Indicador de estado online/offline
  - Eventos recientes con funcionalidad de anular
  - Auto-refresh cada 30 segundos
  - Optimizado para trabajo offline-first en campo

#### Componentes y Utilidades

- **Componente Alert** (`components/ui/alert.tsx`):
  - Componente para mostrar errores y alertas al usuario
  - Variantes: default, destructive
  - Integrado con shadcn/ui

- **Manejo de Errores Enterprise-Grade**:
  - Error handling completo en todas las landing pages
  - Mensajes de error user-friendly
  - Loading states apropiados
  - Graceful error handling

- **Optimización de Performance**:
  - Queries paralelas usando `Promise.all()` en todas las landing pages
  - Auto-refresh configurado según necesidades del rol
  - Caching y optimización de re-renders

#### Documentación

- **DEVELOPMENT_RULES.md**:
  - 5 reglas estrictas de desarrollo
  - Descripción detallada de roles con tareas del mundo real
  - Mejores prácticas de la industria para landing pages

- **ROLES.md** (Actualizado):
  - Documentación completa de roles
  - Mejores prácticas de la industria para cada tipo de landing page
  - Separación clara entre DEV (superusuario técnico) y Admin (personal administrativo)

- **SUPABASE_CONFIG_REQUIRED.md**:
  - Guía de configuración de Supabase Dashboard
  - Instrucciones para Site URL y Redirect URLs

### Cambiado

- **Routing por Rol**:
  - DEV ahora redirige a `/dev` (no `/admin`)
  - Admin redirige a `/admin/dashboards`
  - Manager redirige a `/manager/dashboards`
  - Installer redirige a `/installer/eventos`

- **Dependencias** (Actualizaciones de Seguridad):
  - `@supabase/ssr`: 0.1.0 → 0.8.0 (fixes cookie vulnerability)
  - `jspdf`: 2.5.1 → 3.0.4 (fixes DOMPurify XSS vulnerability)

- **Supabase Client**:
  - Manejo graceful de variables de entorno faltantes durante build
  - Previene errores de build cuando env vars no están disponibles

### Corregido

- **TypeScript Errors**:
  - Fix de tipos en queries de Supabase (projection data, active users)
  - Fix de tipos en operaciones de actualización
  - Todas las páginas ahora compilan sin errores

- **Linting Errors**:
  - Removido import no usado (`ArrowRight`)
  - Fix de React Hook dependencies usando `useCallback`
  - Removido uso de `any` type explícito

- **Build Errors**:
  - Fix de errores de prerendering en páginas de autenticación
  - Supabase client ahora maneja build-time gracefully

### Mejorado

- **Experiencia de Usuario**:
  - Todas las landing pages muestran datos reales (no placeholders)
  - Métricas en tiempo real con auto-refresh
  - Indicadores visuales de estado (online/offline, sincronización, errores)
  - Mensajes de error claros y accionables

- **Arquitectura**:
  - Separación clara de responsabilidades por rol
  - Landing pages optimizadas para cada tipo de usuario
  - Código enterprise-grade siguiendo mejores prácticas

- **Documentación**:
  - Documentación completa de roles y permisos
  - Mejores prácticas de la industria documentadas
  - Guías de configuración actualizadas

## Notas Técnicas

### Mejores Prácticas Implementadas

1. **DEV Landing Page**:
   - System health monitoring
   - Quick access to all interfaces
   - Support & debugging tools
   - Separate top-level route
   - Support-focused dashboard

2. **MANAGER Landing Page**:
   - Executive summary KPIs at-a-glance
   - Data freshness indicators
   - Quick navigation to detailed dashboards
   - Real-time monitoring

3. **ADMIN Landing Page**:
   - Work queue indicators
   - Quick actions for common tasks
   - Operational metrics
   - Task-oriented interface

4. **INSTALLER Landing Page**:
   - Sync status at-a-glance
   - Cash box preview
   - Online/offline indicator
   - Recent events summary
   - Mobile-first design

### Seguridad

- Todas las vulnerabilidades fixables han sido resueltas
- Dependencias actualizadas a versiones seguras
- Manejo seguro de variables de entorno

