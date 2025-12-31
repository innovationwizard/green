import { createClient } from '@/lib/supabase/client'
import { exportData, ExportData } from './export-service'

export async function exportAuditLog(
  startDate: Date,
  endDate: Date,
  format: 'csv' | 'xlsx' | 'pdf'
): Promise<void> {
  const supabase = createClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      created_by_user:users!events_created_by_fkey(full_name, email),
      project:projects(human_id)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error al cargar eventos: ${error.message}`)
  }

  const headers = [
    'ID',
    'UUID Cliente',
    'Tipo de Evento',
    'Proyecto',
    'Creado Por',
    'Fecha/Hora',
    'Dispositivo',
    'Reversado Por',
    'Oculto',
    'Duplicado',
    'Payload',
    'Razón',
  ]

  const rows = (events || []).map((event) => {
    const project = event.project as { human_id?: string } | null
    const user = event.created_by_user as { full_name?: string; email?: string } | null
    return [
      event.id,
      event.client_uuid,
      event.event_type,
      project?.human_id || '',
      user?.full_name || user?.email || '',
      format(new Date(event.created_at), "yyyy-MM-dd HH:mm:ss"),
      event.device_id || '',
      event.reversed_by || '',
      event.hidden ? 'Sí' : 'No',
      event.duplicate_flag ? 'Sí' : 'No',
      JSON.stringify(event.payload),
      event.reason || '',
    ]
  })

  const exportDataObj: ExportData = {
    title: `Auditoria_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`,
    headers,
    rows,
  }

  exportData(exportDataObj, format)
}

