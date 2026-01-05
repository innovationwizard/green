-- Fix: Crear usuario jorgeluiscontrerasherrera@gmail.com en public.users
-- Ejecutar esto en Supabase SQL Editor

-- Opción 1: Crear usuario automáticamente usando subquery (más fácil)
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Jorge Luis Contreras Herrera') as full_name,
  'developer' as role  -- Cambiar a 'admin', 'manager', o 'installer' si prefieres otro rol
FROM auth.users au
WHERE au.email = 'jorgeluiscontrerasherrera@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  )
ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT id, email, full_name, role, active 
FROM public.users 
WHERE email = 'jorgeluiscontrerasherrera@gmail.com';

-- Si necesitas cambiar el rol después:
-- UPDATE public.users SET role = 'admin' WHERE email = 'jorgeluiscontrerasherrera@gmail.com';

