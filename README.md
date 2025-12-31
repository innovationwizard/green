# GREENTELLIGENCE

Optimización y Automatización de Procesos con Inteligencia Artificial

Sistema completo de gestión operativa para empresas de energía solar EPC (Engineering, Procurement, Construction) con capacidades offline-first, análisis en tiempo real y insights de IA.

## Características Principales

- **Offline-First PWA**: Funciona completamente offline en dispositivos Android de gama media/baja
- **Event Ledger Append-Only**: Sistema de eventos inmutable como fuente de verdad
- **Sincronización Inteligente**: Sincronización automática con resolución de conflictos
- **Dashboards en Tiempo Real**: 4 dashboards ejecutivos con actualización ≤1 hora
- **Gestión de Caja por Instalador**: Seguimiento individual de efectivo
- **Sistema de Correcciones**: Anular/Eliminar con eventos de reversión
- **Detección de Duplicados**: Prevención automática de eventos duplicados
- **Reglas de Omisión**: Sistema configurable de alertas

## Stack Tecnológico

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Offline**: IndexedDB (idb library)
- **Estilos**: Tailwind CSS, shadcn/ui
- **Gráficos**: Recharts
- **PWA**: next-pwa
- **Dependencias Principales**:
  - `@supabase/ssr`: ^0.8.0 (autenticación SSR)
  - `jspdf`: ^3.0.4 (generación de PDFs)
  - `xlsx`: ^0.18.5 (importación/exportación Excel)
  - `lucide-react`: ^0.562.0 (iconos)

## Requisitos Previos

- Node.js 18+ y npm/yarn
- Cuenta de Supabase (o instalación local)
- Git

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd green
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Editar `.env.local` con tus credenciales de Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

4. **Configurar base de datos**
   
   Si usas Supabase local:
   ```bash
   # Inicializar Supabase localmente
   supabase init
   supabase start
   
   # Ejecutar migraciones
   supabase migration up
   ```
   
   Si usas Supabase Cloud:
   - Crear un nuevo proyecto en Supabase
   - Ejecutar las migraciones SQL desde `supabase/migrations/` en el SQL Editor
   - Crear un bucket de storage llamado `event-photos` con políticas públicas

5. **Generar tipos de TypeScript** (opcional, si usas Supabase local)
   ```bash
   npm run db:generate
   ```

6. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

7. **Acceder a la aplicación**
   - Abrir http://localhost:3000
   - Crear el primer usuario admin desde Supabase Auth

## Estructura del Proyecto

```
green/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (installer)/       # Rutas de instalador
│   ├── (admin)/           # Rutas de administrador
│   ├── (manager)/         # Rutas de gerente
│   ├── (dev)/             # Rutas de desarrollador (superusuario)
│   └── api/               # API routes
├── components/
│   ├── installer/         # Componentes específicos de instalador
│   ├── admin/             # Componentes específicos de admin
│   ├── shared/            # Componentes compartidos
│   ├── dashboards/        # Componentes de dashboards
│   └── ui/                # Componentes UI base (shadcn/ui)
├── lib/
│   ├── supabase/          # Cliente Supabase y utilidades
│   ├── indexeddb/         # Wrapper de IndexedDB
│   ├── events/            # Sistema de eventos
│   ├── sync/              # Servicio de sincronización
│   ├── projections/       # Cálculos de proyecciones
│   └── utils/             # Utilidades generales
├── types/                 # Tipos TypeScript
├── supabase/
│   ├── migrations/        # Migraciones SQL
│   └── functions/         # Edge Functions (futuro)
└── public/                # Assets estáticos, PWA manifest
```

## Roles y Permisos

- **Installer**: Puede crear eventos offline, sincronizar, anular sus propios eventos hasta el sábado 23:59. Ruta: `/installer/*`
  - Landing page: Dashboard con estado de sincronización, balance de caja, y eventos recientes
- **Admin**: Personal administrativo/contabilidad/papeleo. Acceso completo a CRUD, dashboards, eliminación de eventos, configuración. Ruta: `/admin/*`
  - Landing page: Panel administrativo con métricas operacionales, cola de trabajo (excepciones pendientes), y acciones rápidas
- **Manager**: CEO/Decision maker. Solo lectura de dashboards y visibilidad. Ruta: `/manager/*`
  - Landing page: Dashboards ejecutivos con resumen ejecutivo (KPIs) a primera vista y acceso rápido a dashboards detallados
- **Developer**: Superusuario técnico (soporte/debugging). Acceso completo a TODAS las rutas: `/dev/*`, `/admin/*`, `/manager/*`, `/installer/*`. **IMPORTANTE:** Developer es completamente separado de Admin (no está anidado bajo admin).
  - Landing page: Dashboard de desarrollador con monitoreo de salud del sistema, métricas en tiempo real, y herramientas de soporte

Ver `ROLES.md` y `DEVELOPMENT_RULES.md` para detalles completos sobre roles y mejores prácticas.

## Funcionalidades Clave

### Para Instaladores

1. **Dashboard de Inicio**: Vista general con estado de sincronización, balance de caja, y eventos recientes
2. **Crear Eventos**: Materiales, gastos, mano de obra, subcontratistas, etc.
3. **Temporizador**: Registro de horas trabajadas con timer o entrada manual
4. **Mi Caja**: Balance y últimos 5 movimientos de efectivo
5. **Sincronización**: Estado de sincronización y sincronización manual

### Para Administradores

1. **Panel Administrativo**: Landing page con métricas operacionales (excepciones pendientes, eventos recientes, proyectos totales)
2. **Cola de Trabajo**: Indicadores visuales de tareas que requieren atención
3. **Acciones Rápidas**: Acceso directo a excepciones, importación, exportación, proyecciones, configuración
4. **Dashboards**: 4 dashboards ejecutivos con KPIs y gráficos
5. **Gestión de Master Data**: Proyectos, items, clientes, usuarios, tarifas
6. **Importación de Cotizaciones**: CSV/XLSX y extracción de PDF
7. **Centro de Excepciones**: Duplicados y alertas de omisión
8. **Exportación de Auditoría**: CSV/XLSX/PDF con trazabilidad completa

### Para Managers (CEO)

1. **Dashboards Ejecutivos**: Landing page con resumen ejecutivo (KPIs) a primera vista
2. **Métricas Clave**: Ingresos, costos, utilidad neta, margen de utilidad (últimos 30 días)
3. **Dashboards Detallados**: Acceso rápido a 4 dashboards ejecutivos completos

### Para Developers (Superusuario)

1. **Developer Dashboard**: Monitoreo de salud del sistema en tiempo real
2. **Métricas del Sistema**: Usuarios activos, eventos, excepciones, estado de proyecciones, sincronización
3. **Acceso Rápido**: Enlaces directos a todas las interfaces (Admin, Manager, Installer)
4. **Herramientas de Soporte**: Centro de excepciones, exportación de auditoría, configuración, proyecciones

## Sistema de Eventos

El sistema usa un ledger append-only con los siguientes tipos de eventos:

- `MATERIAL_ADDED`: Material agregado (compra/almacén/prestado)
- `MATERIAL_RETURNED_WAREHOUSE`: Material devuelto a almacén
- `MATERIAL_RETURNED_PROJECT`: Material devuelto a proyecto
- `EXPENSE_LOGGED`: Gasto registrado
- `LABOR_LOGGED`: Mano de obra registrada
- `SUBCONTRACTOR_COST`: Costo de subcontratista
- `CHANGE_ORDER_ADDED`: Orden de cambio
- `CLIENT_INVOICE_ISSUED`: Factura emitida
- `CLIENT_PAYMENT_RECEIVED`: Pago recibido
- `VENDOR_BILL_RECEIVED`: Factura de proveedor recibida
- `VENDOR_PAYMENT_MADE`: Pago a proveedor realizado
- `CASH_ADVANCE_ISSUED`: Adelanto de efectivo
- `REIMBURSEMENT_ISSUED`: Reembolso
- `CREDIT_PURCHASE_RECORDED`: Compra a crédito
- `CLIENT_REFUND_ISSUED`: Reembolso a cliente
- `VENDOR_REFUND_RECEIVED`: Reembolso de proveedor
- `PROJECT_STATUS_CHANGED`: Cambio de estado de proyecto
- `EVENT_REVERSED`: Evento revertido

## Proyecciones y Dashboards

El sistema calcula proyecciones server-side cada 10-30 minutos:

- `project_costs_daily`: Costos diarios por proyecto
- `project_revenue_daily`: Ingresos diarios por proyecto
- `cash_ledger_daily`: Flujo de caja diario
- `ar_aging_snapshot`: Envejecimiento de cuentas por cobrar
- `ap_aging_snapshot`: Envejecimiento de cuentas por pagar
- `project_kpis`: KPIs por proyecto
- `client_kpis`: KPIs por cliente

## Desarrollo

### Ejecutar en desarrollo
```bash
npm run dev
```

### Build de producción
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

### Type checking
```bash
npm run type-check
```

## Despliegue

### Vercel (Recomendado)

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático en cada push

### Otros proveedores

El proyecto es compatible con cualquier proveedor que soporte Next.js:
- Netlify
- Railway
- AWS Amplify
- Google Cloud Run

## Configuración de PWA

La aplicación está configurada como PWA. Para instalarla:

1. En Android: Abrir en Chrome, menú → "Agregar a pantalla de inicio"
2. En iOS: Safari → Compartir → "Agregar a pantalla de inicio"

## Soporte y Contribución

Para reportar bugs o solicitar features, crear un issue en el repositorio.

## Licencia

Propietario - Todos los derechos reservados

## Notas de Implementación

- El sistema está diseñado para operar completamente offline
- La sincronización es append-only, sin resolución de conflictos compleja
- Los eventos nunca se editan, solo se revierten con nuevos eventos
- El sistema de proyecciones es eventualmente consistente
- Las fotos se almacenan en Supabase Storage
- La geolocalización es opcional y no bloquea la creación de eventos

