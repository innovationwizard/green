# Guía de Despliegue - GREEN APP

## Paso 1: Configurar Supabase

### Opción A: Supabase Cloud (Recomendado para producción)

1. **Crear cuenta y proyecto**
   - Ir a [supabase.com](https://supabase.com)
   - Crear cuenta (si no tienes una)
   - Click en "New Project"
   - Nombre: `green-app` (o el que prefieras)
   - Contraseña de base de datos: **Guardar esta contraseña**
   - Región: Elegir la más cercana (US East, US West, EU, etc.)
   - Click "Create new project"
   - Esperar 2-3 minutos a que se cree

2. **Obtener credenciales**
   - Ir a Settings → API
   - Copiar:
     - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (⚠️ mantener secreto)

### Opción B: Supabase Local (Solo para desarrollo)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar
supabase init

# Iniciar localmente
supabase start

# Las credenciales aparecerán en la consola
```

## Paso 2: Ejecutar Migraciones de Base de Datos

### En Supabase Cloud:

1. **Ir a SQL Editor** en el dashboard de Supabase
2. **Crear nueva query**
3. **Ejecutar migraciones en orden:**

   **Migración 1:** Copiar y pegar el contenido completo de:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
   - Click "Run" o presionar Cmd/Ctrl + Enter
   - Verificar que no hay errores

   **Migración 2:** Copiar y pegar el contenido completo de:
   ```
   supabase/migrations/002_projection_functions.sql
   ```
   - Click "Run"
   - Verificar que no hay errores

### En Supabase Local:

```bash
supabase migration up
```

## Paso 3: Configurar Storage Bucket

1. **Ir a Storage** en el dashboard de Supabase
2. **Crear nuevo bucket:**
   - Nombre: `event-photos`
   - Public bucket: ✅ **Marcar como público** (o configurar políticas después)
   - Click "Create bucket"

3. **Configurar políticas (si no es público):**
   - Ir a Storage → Policies → `event-photos`
   - Crear nueva política:
     - **Policy Name:** `Allow authenticated uploads`
     - **Policy Definition:**
       ```sql
       (bucket_id = 'event-photos'::text) AND (auth.role() = 'authenticated'::text)
       ```
     - **Allowed Operations:** SELECT, INSERT, UPDATE
     - Click "Save"

## Paso 4: Configurar Autenticación

1. **Ir a Authentication → Settings**
2. **Configurar:**
   - **Site URL:** Tu dominio de producción (ej: `https://green-app.vercel.app`)
   - **Redirect URLs:** Agregar:
     - `https://green-app.vercel.app/**` (tu dominio)
     - `http://localhost:3000/**` (para desarrollo local)
   - **Session Duration:** `2592000` (30 días en segundos)
   - Click "Save"

## Paso 5: Crear Primer Usuario Admin

### Método 1: Desde Supabase Dashboard (Más fácil)

1. **Ir a Authentication → Users**
2. **Click "Add User" → "Create new user"**
3. **Ingresar:**
   - Email: `admin@tudominio.com`
   - Password: (crear contraseña segura)
   - Auto Confirm User: ✅ **Marcar**
   - Click "Create user"
4. **Copiar el User ID** que aparece (UUID)
5. **Ir a SQL Editor** y ejecutar:
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES (
     'PEGAR_USER_ID_AQUI',
     'admin@tudominio.com',
     'Admin User',
     'admin'
   );
   ```
   Reemplazar `PEGAR_USER_ID_AQUI` con el UUID copiado

### Método 2: Crear función automática (Opcional)

Ejecutar en SQL Editor:

```sql
-- Función para crear usuario automáticamente cuando se registra en auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'installer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Luego crear usuario desde Auth y actualizar rol manualmente:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'admin@tudominio.com';
```

## Paso 6: Configurar Variables de Entorno

### Para desarrollo local:

1. **Crear archivo `.env.local`** en la raíz del proyecto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

2. **Reemplazar con tus valores reales** de Supabase

### Para producción (Vercel/Netlify/etc):

Las variables se configuran en el dashboard del proveedor (ver Paso 7)

## Paso 7: Desplegar la Aplicación

### Opción A: Vercel (Recomendado - Más fácil)

1. **Instalar Vercel CLI** (opcional, también puedes usar GitHub):
   ```bash
   npm install -g vercel
   ```

2. **Conectar repositorio a Vercel:**
   - Ir a [vercel.com](https://vercel.com)
   - Sign in con GitHub
   - Click "Add New Project"
   - Seleccionar repositorio `innovationwizard/green`
   - Click "Import"

3. **Configurar proyecto:**
   - Framework Preset: **Next.js** (debería detectarse automáticamente)
   - Root Directory: `./` (dejar por defecto)
   - Build Command: `npm run build` (por defecto)
   - Output Directory: `.next` (por defecto)
   - Install Command: `npm install` (por defecto)

4. **Configurar Environment Variables:**
   - En la sección "Environment Variables", agregar:
     - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key
     - `SUPABASE_SERVICE_ROLE_KEY` = tu service role key
   - Click "Deploy"

5. **Esperar el deploy** (2-5 minutos)
   - Vercel te dará una URL como: `https://green-xxx.vercel.app`

6. **Actualizar Site URL en Supabase:**
   - Ir a Supabase → Authentication → Settings
   - Cambiar Site URL a tu URL de Vercel
   - Agregar URL de Vercel a Redirect URLs

### Opción B: Netlify

1. **Conectar repositorio:**
   - Ir a [netlify.com](https://netlify.com)
   - Sign in con GitHub
   - Click "Add new site" → "Import an existing project"
   - Seleccionar repositorio

2. **Configurar build:**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Click "Deploy site"

3. **Configurar variables de entorno:**
   - Site settings → Environment variables
   - Agregar las 3 variables de Supabase

### Opción C: Railway

1. **Conectar repositorio:**
   - Ir a [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Seleccionar repositorio

2. **Configurar:**
   - Railway detectará Next.js automáticamente
   - Agregar variables de entorno en Variables tab

### Opción D: Self-hosted (VPS/Docker)

```bash
# Clonar repositorio
git clone https://github.com/innovationwizard/green.git
cd green

# Instalar dependencias
npm install

# Crear .env.local con variables de entorno
nano .env.local

# Build
npm run build

# Iniciar
npm start
```

## Paso 8: Crear Iconos PWA

Los iconos son necesarios para que la PWA funcione correctamente:

1. **Crear iconos:**
   - `icon-192.png` (192x192px)
   - `icon-512.png` (512x512px)
   - Usar el logo de GREEN APP

2. **Herramientas recomendadas:**
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - O crear manualmente con cualquier editor de imágenes

3. **Colocar en `public/`**:
   ```bash
   public/icon-192.png
   public/icon-512.png
   ```

4. **Commit y push:**
   ```bash
   git add public/icon-*.png
   git commit -m "Add PWA icons"
   git push
   ```

## Paso 9: Configurar Scheduled Jobs (Proyecciones)

Las proyecciones necesitan ejecutarse cada 10-30 minutos. Opciones:

### Opción A: Supabase Edge Functions + pg_cron (Recomendado)

1. **Crear Edge Function** (futuro - por ahora usar Opción B o C)

### Opción B: Vercel Cron Jobs (Si usas Vercel)

1. **Crear archivo `vercel.json`:**
   ```json
   {
     "crons": [{
       "path": "/api/projections/update",
       "schedule": "*/15 * * * *"
     }]
   }
   ```

2. **Crear API route** `app/api/projections/update/route.ts`:
   ```typescript
   import { createClient } from '@/lib/supabase/server'
   import { NextResponse } from 'next/server'

   export async function GET() {
     const supabase = await createClient()
     
     // Ejecutar funciones de proyección
     const { error } = await supabase.rpc('compute_project_costs_daily', {
       start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
       end_date: new Date().toISOString().split('T')[0]
     })
     
     if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 })
     }
     
     return NextResponse.json({ success: true })
   }
   ```

### Opción C: External Cron Service

Usar [cron-job.org](https://cron-job.org) o similar:
- URL: `https://tu-dominio.com/api/projections/update`
- Frecuencia: Cada 15 minutos
- Método: GET

## Paso 10: Verificación Post-Deploy

1. **Verificar aplicación:**
   - Abrir URL de producción
   - Debería cargar sin errores

2. **Probar login:**
   - Ir a `/auth/login`
   - Iniciar sesión con usuario admin creado
   - Debería redirigir a `/admin`

3. **Verificar funcionalidades:**
   - ✅ Login funciona
   - ✅ Dashboards cargan (aunque estén vacíos)
   - ✅ Puedes crear proyectos
   - ✅ Puedes crear eventos como instalador
   - ✅ Sincronización funciona

4. **Probar PWA:**
   - En móvil Android: Abrir en Chrome → Menú → "Agregar a pantalla de inicio"
   - Debería instalarse como app

## Paso 11: Configuración Inicial (Onboarding)

1. **Acceder como admin:**
   - Login con usuario admin
   - Ir a `/admin/onboarding`

2. **Seguir wizard:**
   - Crear instaladores
   - Importar catálogo de items
   - Configurar tarifas
   - Crear primer proyecto
   - Importar primera cotización

## Troubleshooting

### Error: "relation does not exist"
- **Solución:** Verificar que las migraciones se ejecutaron correctamente
- Re-ejecutar migraciones en SQL Editor

### Error: "permission denied"
- **Solución:** Verificar políticas RLS en Supabase
- Verificar que el usuario tiene rol correcto en tabla `users`

### Error: "storage bucket not found"
- **Solución:** Crear bucket `event-photos` en Storage
- Verificar políticas del bucket

### PWA no se instala
- **Solución:** Verificar que `manifest.json` existe
- Verificar que los iconos existen en `public/`
- Verificar que estás usando HTTPS (requerido para PWA)

### Eventos no se sincronizan
- **Solución:** Verificar conexión a internet
- Verificar que IndexedDB está habilitado
- Verificar logs de consola del navegador

### Build falla en Vercel
- **Solución:** Verificar que todas las variables de entorno están configuradas
- Verificar logs de build en Vercel dashboard
- Verificar que `package.json` tiene todas las dependencias

## Checklist Final

- [ ] Supabase configurado y migraciones ejecutadas
- [ ] Storage bucket `event-photos` creado
- [ ] Usuario admin creado
- [ ] Variables de entorno configuradas
- [ ] Aplicación desplegada
- [ ] Iconos PWA agregados
- [ ] Scheduled jobs configurados (opcional pero recomendado)
- [ ] Login funciona
- [ ] PWA se instala correctamente
- [ ] Onboarding completado

## Soporte

Si encuentras problemas:
1. Revisar logs en Supabase Dashboard → Logs
2. Revisar logs en Vercel/Netlify Dashboard
3. Revisar consola del navegador (F12)
4. Verificar que todas las variables de entorno están correctas

¡Tu aplicación debería estar funcionando ahora! 🎉

