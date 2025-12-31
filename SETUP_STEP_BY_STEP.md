# Setup Paso a Paso - GREEN APP

## ✅ Completado
- [x] Migraciones ejecutadas
- [x] Funciones creadas
- [x] Bucket `event-photos` creado
- [x] Roles verificados

## 📋 Paso Actual: Crear Usuario Admin

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Ir a Authentication → Users** en Supabase Dashboard
2. **Click "Add User" → "Create new user"**
3. **Completar formulario:**
   - Email: `admin@tudominio.com` (o el email que prefieras)
   - Password: (crea una contraseña segura - guárdala bien)
   - Auto Confirm User: ✅ **Marcar esta casilla**
   - Click "Create user"

4. **Después de crear, copiar el User ID:**
   - Aparecerá un UUID como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Copia este UUID completo

5. **Ejecutar SQL en SQL Editor:**
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES (
     'PEGAR_EL_UUID_AQUI',  -- Reemplaza con el UUID copiado
     'admin@tudominio.com',  -- El email que usaste
     'Admin User',            -- Nombre completo
     'admin'                  -- Rol admin
   );
   ```

6. **Verificar que se creó:**
   ```sql
   SELECT id, email, full_name, role FROM public.users WHERE role = 'admin';
   ```

---

## 📋 Siguiente Paso: Obtener Credenciales de Supabase

1. **Ir a Settings → API** en Supabase Dashboard
2. **Copiar estos 3 valores:**

   **a) Project URL:**
   - Está en la parte superior
   - Formato: `https://xxxxx.supabase.co`
   - Este será `NEXT_PUBLIC_SUPABASE_URL`

   **b) anon public key:**
   - Busca "Project API keys"
   - Copia la key que dice "anon" "public"
   - Este será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   **c) service_role key:**
   - En la misma sección, busca "service_role" "secret"
   - ⚠️ **IMPORTANTE:** Esta key es SECRETA, nunca la compartas públicamente
   - Este será `SUPABASE_SERVICE_ROLE_KEY`

3. **Guardar estos valores** en un lugar seguro (los necesitarás para Vercel)

---

## 📋 Desplegar en Vercel

### Paso 1: Conectar Repositorio

1. Ir a [vercel.com](https://vercel.com)
2. Sign in con GitHub (si no tienes cuenta, créala)
3. Click "Add New Project" o "Import Project"
4. Seleccionar repositorio `innovationwizard/green`
5. Click "Import"

### Paso 2: Configurar Proyecto

1. **Framework Preset:** Debería detectar "Next.js" automáticamente
2. **Root Directory:** `./` (dejar por defecto)
3. **Build Command:** `npm run build` (por defecto)
4. **Output Directory:** `.next` (por defecto)
5. **Install Command:** `npm install` (por defecto)

### Paso 3: Agregar Variables de Entorno

**ANTES de hacer click en "Deploy", agregar variables:**

1. Click en "Environment Variables"
2. Agregar estas 3 variables:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (pegar tu Project URL de Supabase)
   - Environments: Production, Preview, Development (marcar todos)

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (pegar tu anon public key)
   - Environments: Production, Preview, Development (marcar todos)

   **Variable 3:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (pegar tu service_role key)
   - Environments: Production, Preview, Development (marcar todos)

3. Click "Save" después de cada variable

### Paso 4: Deploy

1. Click "Deploy"
2. Esperar 2-5 minutos mientras construye
3. Verás el progreso en tiempo real
4. Al finalizar, verás una URL como: `https://green-xxx.vercel.app`

---

## 📋 Configurar Site URL en Supabase

1. **Copiar tu URL de Vercel** (ej: `https://green-xxx.vercel.app`)
2. **Ir a Supabase → Authentication → Settings**
3. **Actualizar:**
   - **Site URL:** Pegar tu URL de Vercel
   - **Redirect URLs:** Agregar:
     - `https://green-xxx.vercel.app/**` (tu URL completa con `/**` al final)
     - `http://localhost:3000/**` (para desarrollo local)
4. **Click "Save"**

---

## 📋 Probar la Aplicación

1. **Abrir tu URL de Vercel** en el navegador
2. **Deberías ver la página de login**
3. **Login con tu usuario admin:**
   - Email: el que creaste
   - Password: la contraseña que pusiste
4. **Deberías ser redirigido a `/admin`**
5. **Verificar que puedes ver:**
   - Dashboards
   - Navegación admin

---

## 📋 Crear Usuarios Adicionales (Opcional)

### Crear Manager (Sergio):

1. Crear usuario en Authentication (igual que admin)
2. Ejecutar SQL:
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES (
     'UUID_DEL_USUARIO',
     'sergio@tudominio.com',
     'Sergio',
     'manager'
   );
   ```

### Crear Installer:

1. Crear usuario en Authentication
2. Ejecutar SQL:
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES (
     'UUID_DEL_USUARIO',
     'installer@tudominio.com',
     'Nombre Instalador',
     'installer'
   );
   ```

---

## 🎯 Checklist Final

- [ ] Usuario admin creado en Authentication
- [ ] Usuario admin agregado a tabla `users` con rol `admin`
- [ ] Credenciales de Supabase copiadas
- [ ] Proyecto desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Site URL configurado en Supabase
- [ ] Login funciona correctamente
- [ ] Puedes acceder a dashboards admin

---

## 🆘 Troubleshooting

### Error: "User not found" al hacer login
- Verificar que el usuario existe en `auth.users`
- Verificar que existe en `public.users` con el mismo UUID
- Verificar que el rol está correcto

### Error: "permission denied"
- Verificar que el rol en `public.users` es correcto
- Verificar políticas RLS en Supabase

### Error: Build falla en Vercel
- Verificar que todas las variables de entorno están configuradas
- Verificar logs de build en Vercel dashboard
- Verificar que no hay errores de TypeScript

### Error: "Invalid API key"
- Verificar que copiaste las keys correctas
- Verificar que no hay espacios extra
- Verificar que las variables están en todos los environments

---

¡Sigue estos pasos y estarás listo! 🚀

