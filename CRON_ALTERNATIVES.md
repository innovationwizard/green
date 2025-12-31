# Alternativas para Scheduled Jobs (Proyecciones)

El cron job de Vercel requiere plan Pro. Aquí hay alternativas gratuitas:

## Opción 1: Servicio Externo Gratuito (Recomendado)

### Usar cron-job.org (Gratuito)

1. Ir a [cron-job.org](https://cron-job.org)
2. Crear cuenta gratuita
3. Crear nuevo cron job:
   - **URL:** `https://tu-app.vercel.app/api/projections/update`
   - **Schedule:** Cada 15 minutos: `*/15 * * * *`
   - **Request Method:** GET
   - Click "Create Cronjob"

### Otros servicios gratuitos:
- [EasyCron](https://www.easycron.com) - 1 cron job gratis
- [UptimeRobot](https://uptimerobot.com) - Monitoreo + cron jobs
- [GitHub Actions](https://github.com/features/actions) - Si tienes el repo en GitHub

## Opción 2: Ejecutar Manualmente

Puedes ejecutar las proyecciones manualmente cuando las necesites:

1. Abrir: `https://tu-app.vercel.app/api/projections/update`
2. O crear un botón en el admin para ejecutarlas

## Opción 3: Vercel Pro

Si necesitas el cron job integrado:
- Upgrade a Vercel Pro ($20/mes)
- Habilita cron jobs en el plan Pro
- Restaura el `vercel.json` con el cron job

## Opción 4: Supabase Edge Functions + pg_cron

Configurar pg_cron en Supabase (requiere configuración avanzada):

```sql
-- Ejecutar en Supabase SQL Editor
SELECT cron.schedule(
  'update-projections',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://tu-app.vercel.app/api/projections/update'
  ) AS request_id;
  $$
);
```

**Nota:** Esto requiere habilitar la extensión `pg_cron` en Supabase.

---

## Recomendación

Para empezar, usar **cron-job.org** (Opción 1) es la más simple y gratuita. Las proyecciones se ejecutarán automáticamente cada 15 minutos.

