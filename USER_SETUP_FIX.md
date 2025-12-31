# Fix: "No se pudo determinar el rol del usuario"

## Problema

Este error ocurre cuando un usuario existe en `auth.users` (puede autenticarse) pero **NO** existe en `public.users` (no tiene rol asignado).

## Solución Inmediata (Para el Usuario Afectado)

### Paso 1: Identificar el Usuario

1. Ir a **Supabase Dashboard → Authentication → Users**
2. Buscar el usuario que está teniendo el problema (por email)
3. **Copiar el User ID** (UUID) del usuario

### Paso 2: Crear el Usuario en public.users

1. Ir a **Supabase Dashboard → SQL Editor**
2. Ejecutar el siguiente SQL (reemplazar los valores):

```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'PEGAR_USER_ID_AQUI',        -- Pegar el UUID copiado en Paso 1
  'email@delusuario.com',      -- El email del usuario
  'Nombre del Usuario',         -- Nombre completo (opcional)
  'installer'                   -- Rol inicial: 'installer', 'admin', 'manager', o 'developer'
)
ON CONFLICT (id) DO NOTHING;   -- Evita errores si ya existe
```

### Paso 3: Verificar

```sql
SELECT id, email, full_name, role FROM public.users WHERE email = 'email@delusuario.com';
```

El usuario ahora debería poder iniciar sesión correctamente.

---

## Solución Permanente (Para Prevenir el Problema)

### Ejecutar la Migración

Ejecutar la migración `004_fix_user_creation.sql` que crea un trigger automático para crear usuarios en `public.users` cuando se registran en Supabase Auth.

**En Supabase Dashboard → SQL Editor:**

1. Copiar el contenido de `supabase/migrations/004_fix_user_creation.sql`
2. Ejecutar el SQL completo
3. Verificar que no haya errores

### Qué Hace la Migración

1. **Crea función `handle_new_user()`**: Crea automáticamente un usuario en `public.users` cuando se registra en `auth.users`
2. **Crea trigger `on_auth_user_created`**: Ejecuta la función automáticamente
3. **Arregla políticas RLS**: Corrige la dependencia circular en las políticas de seguridad
4. **Agrega políticas INSERT**: Permite la creación automática de usuarios

### Nota Importante

- **Usuarios creados manualmente** en Supabase Auth Dashboard antes de ejecutar esta migración **aún necesitan** ser creados manualmente en `public.users` (usar Solución Inmediata arriba)
- **Usuarios nuevos** creados después de ejecutar la migración se crearán automáticamente con rol `installer` (puede cambiarse después)

---

## Verificar Todos los Usuarios

Para ver todos los usuarios que tienen este problema:

```sql
-- Usuarios en auth.users que NO están en public.users
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

Para crear todos estos usuarios automáticamente (con rol 'installer' por defecto):

```sql
-- ⚠️ CUIDADO: Esto creará usuarios con rol 'installer' por defecto
-- Ajusta el rol según sea necesario después
INSERT INTO public.users (id, email, role, full_name)
SELECT 
  au.id,
  au.email,
  'installer' as role,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

---

## Cambiar Rol de Usuario

Para cambiar el rol de un usuario después de crearlo:

```sql
UPDATE public.users
SET role = 'admin'  -- o 'manager', 'developer', 'installer'
WHERE email = 'email@delusuario.com';
```

