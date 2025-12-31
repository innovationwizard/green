# Roles y Permisos - GREENTELLIGENCE

## Definición de Roles

### 1. Developer (Superuser)
**Usuario:** Tú (desarrollador)  
**Acceso:** TODO - Superuser bypass para soporte técnico

**Permisos:**
- ✅ Acceso completo a toda la aplicación
- ✅ Puede ver todos los eventos (incluyendo ocultos)
- ✅ Puede acceder a todas las rutas admin
- ✅ Bypass de seguridad para debugging y soporte
- ✅ CRUD completo en master data
- ✅ Dashboards completos
- ✅ Exportación de auditoría completa

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
**Usuario:** Personal administrativo, contabilidad, papeleo  
**Acceso:** CRUD completo, conciliaciones, supervisión de instaladores

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
- `/admin/*` - Todas las rutas admin

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

