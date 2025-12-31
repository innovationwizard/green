# Quick Start - GREENTELLIGENCE Deployment

## 🚀 Pasos Rápidos para Publicar

### 1. Supabase (5 minutos)
- [ ] Crear cuenta en [supabase.com](https://supabase.com)
- [ ] Crear nuevo proyecto
- [ ] Copiar credenciales (URL, anon key, service_role key)
- [ ] Ejecutar migraciones SQL desde `supabase/migrations/`
- [ ] Crear bucket `event-photos` en Storage

### 2. Usuario Admin (2 minutos)
- [ ] Crear usuario en Authentication → Users
- [ ] Ejecutar SQL para asignar rol admin:
  ```sql
  INSERT INTO public.users (id, email, full_name, role)
  VALUES ('USER_ID', 'admin@email.com', 'Admin', 'admin');
  ```

### 3. Desplegar en Vercel (5 minutos)
- [ ] Ir a [vercel.com](https://vercel.com)
- [ ] Conectar repositorio GitHub `innovationwizard/green`
- [ ] Agregar variables de entorno:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Click "Deploy"

### 4. Configurar (2 minutos)
- [ ] Actualizar Site URL en Supabase Auth settings
- [ ] Agregar iconos PWA (`icon-192.png`, `icon-512.png`) en `public/`
- [ ] Commit y push iconos

### 5. Verificar (2 minutos)
- [ ] Abrir URL de Vercel
- [ ] Login con usuario admin
- [ ] Verificar que dashboards cargan

**Total: ~15 minutos** ⏱️

---

## 📋 Checklist Completo

Ver `DEPLOYMENT.md` para guía detallada paso a paso.

## 🔗 Enlaces Útiles

- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Repositorio:** https://github.com/innovationwizard/green

## ⚠️ Importante

1. **Nunca compartas** `SUPABASE_SERVICE_ROLE_KEY` públicamente
2. **Guarda las contraseñas** de Supabase en un lugar seguro
3. **Crea iconos PWA** antes de producción (requerido para instalación)

## 🆘 Problemas Comunes

- **"relation does not exist"** → Ejecutar migraciones SQL
- **"permission denied"** → Verificar rol de usuario en tabla `users`
- **PWA no instala** → Verificar iconos y HTTPS
- **Build falla** → Verificar variables de entorno

---

¡Listo para desplegar! 🎉

