# Guía de Configuración Detallada

## Paso 1: Configuración de Supabase

### Opción A: Supabase Cloud (Recomendado para producción)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Obtener las siguientes credenciales desde Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (desde Settings → API → service_role key)

### Opción B: Supabase Local (Recomendado para desarrollo)

1. Instalar Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Inicializar proyecto:
   ```bash
   supabase init
   ```

3. Iniciar Supabase localmente:
   ```bash
   supabase start
   ```

4. Las credenciales se mostrarán en la consola. Usar:
   - `http://localhost:54321` como URL
   - Las keys mostradas en la consola

## Paso 2: Ejecutar Migraciones de Base de Datos

### En Supabase Cloud:

1. Ir a SQL Editor en el dashboard
2. Ejecutar cada archivo de `supabase/migrations/` en orden:
   - `001_initial_schema.sql`
   - `002_projection_functions.sql`

### En Supabase Local:

```bash
supabase migration up
```

## Paso 3: Configurar Storage

1. En Supabase Dashboard, ir a Storage
2. Crear un nuevo bucket llamado `event-photos`
3. Configurar políticas:
   - **Policy Name**: Allow authenticated uploads
   - **Policy Definition**: 
     ```sql
     (bucket_id = 'event-photos'::text) AND (auth.role() = 'authenticated'::text)
     ```
   - **Allowed Operations**: INSERT, SELECT, UPDATE

## Paso 4: Configurar Autenticación

1. En Supabase Dashboard, ir a Authentication → Settings
2. Configurar:
   - **Site URL**: `http://localhost:3000` (desarrollo) o tu dominio de producción
   - **Redirect URLs**: Agregar tu dominio de producción
   - **Session Duration**: 30 días (2592000 segundos)

## Paso 5: Crear Primer Usuario Admin

### Opción A: Desde Supabase Dashboard

1. Ir a Authentication → Users
2. Click en "Add User" → "Create new user"
3. Ingresar email y contraseña
4. Después de crear, ejecutar en SQL Editor:

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  '<user_id_from_auth_users>',
  'admin@example.com',
  'Admin User',
  'admin'
);
```

### Opción B: Desde la aplicación (requiere crear función)

Crear función en Supabase:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'installer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Luego crear usuario desde Auth y actualizar rol manualmente.

## Paso 6: Configurar Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

## Paso 7: Instalar Dependencias e Iniciar

```bash
npm install
npm run dev
```

## Paso 8: Crear Iconos PWA

Los archivos `public/icon-192.png` y `public/icon-512.png` son placeholders.

Para producción, crear iconos reales:
- 192x192px para `icon-192.png`
- 512x512px para `icon-512.png`
- Usar el logo de GREEN APP
- Formato PNG con fondo transparente o sólido

Puedes usar herramientas como:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Paso 9: Configurar Scheduled Jobs (Proyecciones)

Las proyecciones necesitan ejecutarse cada 10-30 minutos. Opciones:

### Opción A: Supabase Edge Functions + pg_cron

Crear función Edge Function que ejecute las proyecciones y configurar pg_cron.

### Opción B: External Cron Job

Usar servicio como:
- [cron-job.org](https://cron-job.org)
- GitHub Actions
- Vercel Cron (si usas Vercel)

Endpoint a llamar: `/api/projections/update` (crear este endpoint)

### Opción C: Supabase Database Webhooks

Configurar webhook que se ejecute cuando se inserten eventos.

## Verificación

1. ✅ Aplicación inicia sin errores
2. ✅ Puedes iniciar sesión con usuario admin
3. ✅ Puedes crear proyectos desde admin
4. ✅ Puedes crear eventos como instalador
5. ✅ Los eventos se sincronizan correctamente
6. ✅ Los dashboards muestran datos (después de crear eventos)

## Troubleshooting

### Error: "relation does not exist"
- Verificar que las migraciones se ejecutaron correctamente
- Verificar que estás conectado a la base de datos correcta

### Error: "permission denied"
- Verificar políticas RLS en Supabase
- Verificar que el usuario tiene el rol correcto

### Error: "storage bucket not found"
- Verificar que el bucket `event-photos` existe
- Verificar políticas del bucket

### PWA no se instala
- Verificar que `manifest.json` existe
- Verificar que los iconos existen
- Verificar que estás usando HTTPS (requerido para PWA en producción)

### Eventos no se sincronizan
- Verificar conexión a internet
- Verificar que IndexedDB está habilitado en el navegador
- Verificar logs de consola para errores

