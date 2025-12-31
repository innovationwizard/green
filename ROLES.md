# Roles y Permisos - GREENTELLIGENCE

## Definición de Roles

### 1. Developer (Superuser)
**Usuario:** Desarrollador/Técnico de soporte  
**Acceso:** TODO - Superuser bypass para soporte técnico y debugging

**IMPORTANTE:** Developer es un SUPERUSUARIO completamente separado de Admin. Admin es para personal administrativo/contabilidad/papeleo. Developer es para soporte técnico y tiene acceso a TODAS las rutas.

**Permisos:**
- ✅ Acceso completo a toda la aplicación
- ✅ Puede ver todos los eventos (incluyendo ocultos)
- ✅ Acceso completo a TODAS las rutas: `/dev/*`, `/admin/*`, `/manager/*`, `/installer/*`
- ✅ Bypass de seguridad para debugging y soporte
- ✅ CRUD completo en master data
- ✅ Dashboards completos
- ✅ Exportación de auditoría completa
- ✅ Puede probar todas las interfaces para debugging y soporte técnico

**Rutas accesibles:**
- `/dev/*` - Dashboard de desarrollador (ruta principal)
- `/admin/*` - Acceso completo a herramientas admin (para soporte)
- `/manager/*` - Acceso a dashboards ejecutivos (para testing/soporte)
- `/installer/*` - Acceso a interfaz de instalador (para testing/soporte)

#### Mejores Prácticas de la Industria para Landing Page de DEV

**¿Por qué un landing page dedicado para DEV?**

Siguiendo las mejores prácticas de la industria para superusuarios/desarrolladores, el landing page de DEV (`/dev`) implementa:

1. **Monitoreo de Salud del Sistema (System Health Monitoring)**
   - **Práctica de la industria:** Los superusuarios necesitan visibilidad inmediata del estado del sistema para detectar problemas rápidamente
   - **Implementación:** Métricas en tiempo real de usuarios activos, eventos recientes, excepciones, y estado de proyecciones
   - **Beneficio:** Permite identificar problemas antes de que los usuarios los reporten

2. **Acceso Rápido a Todas las Interfaces (Quick Access to All Interfaces)**
   - **Práctica de la industria:** Los desarrolladores necesitan acceso rápido a todas las interfaces para testing, debugging y soporte
   - **Implementación:** Enlaces directos a Admin, Manager e Installer interfaces desde el dashboard principal
   - **Beneficio:** Permite replicar problemas de usuarios y probar funcionalidad sin navegación compleja

3. **Herramientas de Soporte y Debugging (Support & Debugging Tools)**
   - **Práctica de la industria:** Los superusuarios necesitan herramientas centralizadas para resolver problemas técnicos
   - **Implementación:** Acceso directo a Centro de Excepciones, Exportación de Auditoría, Configuración del Sistema, y Proyecciones
   - **Beneficio:** Reduce el tiempo de resolución de problemas y facilita el soporte técnico

4. **Ruta Top-Level Separada (Separate Top-Level Route)**
   - **Práctica de la industria:** Los superusuarios técnicos NO deben estar anidados bajo rutas operacionales (como `/admin`)
   - **Implementación:** Ruta dedicada `/dev/*` completamente separada de `/admin/*` (que es para personal administrativo)
   - **Beneficio:** Clarifica la separación de responsabilidades: DEV = soporte técnico, Admin = contabilidad/papeleo

5. **Dashboard Enfocado en Soporte (Support-Focused Dashboard)**
   - **Práctica de la industria:** Los dashboards de superusuarios deben priorizar información técnica y herramientas de soporte sobre operaciones diarias
   - **Implementación:** Dashboard muestra métricas del sistema, acceso a herramientas de debugging, y enlaces a interfaces de testing
   - **Beneficio:** Optimiza el flujo de trabajo para tareas de soporte técnico y debugging

**Referencias de la Industria:**
- Internal Developer Portals (IDPs) siguen este patrón: monitoreo centralizado, acceso rápido a herramientas, y separación de rutas operacionales
- Superuser dashboards en aplicaciones enterprise (Salesforce, ServiceNow, etc.) implementan estos mismos principios
- Best practices de Developer Experience (DX) enfatizan dashboards dedicados para roles técnicos

---

### 2. Manager (CEO / Decision Maker)
**Usuario:** Sergio (CEO)  
**Acceso:** Dashboards, analytics, finanzas - Toma decisiones estratégicas

**Permisos:**
- ✅ **Dashboards completos** - Todos los 4 dashboards ejecutivos
  - Resumen Ejecutivo
  - Economía Unitaria por Proyecto
  - Velocidad del Pipeline de Ventas
  - Flujo de Caja y Capital de Trabajo
- ✅ **Visibilidad de datos** - Puede ver:
  - Todos los proyectos
  - Todos los eventos (no ocultos)
  - Datos financieros y analíticos
- ❌ **NO tiene acceso a:**
  - CRUD de master data (proyectos, items, clientes, usuarios)
  - Importación de cotizaciones
  - Centro de excepciones
  - Exportación de auditoría
  - Configuración del sistema
  - Eliminar eventos (soft delete)

**Rutas accesibles:**
- `/manager/dashboards/*` - Solo dashboards

---

### 3. Admin (Personal Administrativo)
**Usuario:** Personal administrativo, contabilidad, papeleo, personal de oficina  
**Acceso:** CRUD completo, conciliaciones, supervisión de instaladores

**IMPORTANTE:** Admin es para personal administrativo que hace trabajo de oficina (contabilidad, papeleo, fotocopias, extiende recibos). NO es lo mismo que Developer (superusuario técnico).

**Permisos:**
- ✅ **CRUD completo en master data:**
  - Proyectos (crear, editar, eliminar)
  - Items/Catálogo
  - Clientes
  - Usuarios/Instaladores
  - Tarifas de mano de obra
  - Vendedores
- ✅ **Dashboards completos** - Todos los dashboards
- ✅ **Importación de cotizaciones** - CSV/XLSX/PDF
- ✅ **Centro de excepciones** - Duplicados y alertas
- ✅ **Exportación de auditoría** - CSV/XLSX/PDF
- ✅ **Supervisión de instaladores:**
  - Ver todos los eventos de instaladores
  - Ver eventos ocultos (soft deleted)
  - Eliminar eventos (soft delete con "Eliminar")
- ✅ **Conciliaciones contables:**
  - Reconciliación de eventos
  - Verificación de datos
  - Corrección de errores

**Rutas accesibles:**
- `/admin/*` - Todas las rutas admin (NO tiene acceso a `/dev/*`, `/manager/*`, `/installer/*`)

---

### 4. Installer (Personal Operativo de Campo)
**Usuario:** Personal que hace trabajo físico en campo  
**Acceso:** Solo sus propios datos, crear eventos en tiempo real

**Permisos:**
- ✅ **Crear eventos offline:**
  - Materiales agregados
  - Gastos
  - Mano de obra (con temporizador)
  - Subcontratistas
  - Cambios de estado de proyecto
- ✅ **Ver solo sus propios datos:**
  - Sus propios eventos
  - Su propia caja de efectivo
  - Proyectos donde tiene eventos (por nickname)
- ✅ **Sincronización:**
  - Sincronizar eventos offline
  - Ver estado de sincronización
- ✅ **Anular eventos:**
  - Solo sus propios eventos
  - Solo hasta sábado 23:59 (Guatemala timezone)
- ❌ **NO tiene acceso a:**
  - Dashboards
  - Eventos de otros instaladores
  - Master data (proyectos, items, etc.)
  - Eliminar eventos (solo anular)

**Rutas accesibles:**
- `/installer/*` - Solo rutas de instalador

---

## Matriz de Permisos

| Funcionalidad | Developer | Manager | Admin | Installer |
|--------------|-----------|---------|-------|-----------|
| Dashboards | ✅ | ✅ | ✅ | ❌ |
| CRUD Master Data | ✅ | ❌ | ✅ | ❌ |
| Ver Todos los Eventos | ✅ | ✅* | ✅ | ❌ |
| Ver Eventos Ocultos | ✅ | ❌ | ✅ | ❌ |
| Crear Eventos | ✅ | ❌ | ✅ | ✅ (solo propios) |
| Anular Eventos | ✅ | ❌ | ✅ | ✅ (solo propios) |
| Eliminar Eventos | ✅ | ❌ | ✅ | ❌ |
| Importar Cotizaciones | ✅ | ❌ | ✅ | ❌ |
| Centro Excepciones | ✅ | ❌ | ✅ | ❌ |
| Exportar Auditoría | ✅ | ❌ | ✅ | ❌ |
| Configuración Sistema | ✅ | ❌ | ✅ | ❌ |

*Manager puede ver eventos pero no ocultos (soft deleted)

---

## Políticas RLS (Row Level Security)

Las políticas en la base de datos implementan estos permisos:

- **Events:** Installers solo ven sus propios eventos; Manager/Admin/Developer ven todos
- **Projects:** Installers solo ven proyectos donde tienen eventos; Manager/Admin/Developer ven todos
- **Master Data:** Solo Admin/Developer pueden modificar

---

## Notas Importantes

1. **Manager es solo lectura** - No puede modificar datos, solo visualizar dashboards
2. **Admin supervisa instaladores** - Puede ver y corregir eventos de instaladores
3. **Installer trabaja offline** - Puede crear eventos sin conexión, se sincronizan después
4. **Developer tiene bypass** - Para soporte técnico y debugging

