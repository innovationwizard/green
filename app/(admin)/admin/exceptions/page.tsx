'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { ExceptionEvent, OmissionWarning } from '@/types/dashboard.types'
import { Database } from '@/types/database.types'

type EventsUpdate = Database['public']['Tables']['events']['Update']

export default function ExceptionsPage() {
  const [duplicates, setDuplicates] = useState<ExceptionEvent[]>([])
  const [omissionWarnings, setOmissionWarnings] = useState<OmissionWarning[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadExceptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadExceptions() {
    setLoading(true)
    
    // Load duplicate events
    const { data: dupEvents } = await supabase
      .from('events')
      .select(`
        *,
        project:projects(human_id),
        created_by_user:users!events_created_by_fkey(full_name, email)
      `)
      .eq('duplicate_flag', true)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (dupEvents) {
      setDuplicates(dupEvents)
    }

    // Load omission warnings (would be computed from omission_rules)
    // For now, placeholder
    setOmissionWarnings([])

    setLoading(false)
  }

  async function handleResolveDuplicate(eventId: string) {
    const updateData: EventsUpdate = { duplicate_flag: false }
    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (!error) {
      await loadExceptions()
    }
  }

  if (loading) {
    return <div className="p-4">Cargando excepciones...</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Centro de Excepciones</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Eventos Duplicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {duplicates.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay eventos duplicados
            </p>
          ) : (
            <div className="space-y-2">
              {duplicates.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border rounded flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {event.event_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Proyecto: {event.project?.human_id || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Creado por: {event.created_by_user?.full_name || event.created_by_user?.email || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), "d 'de' MMM 'a las' HH:mm", {
                        locale: es,
                      })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveDuplicate(event.id)}
                  >
                    Resolver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertas de Omisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {omissionWarnings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay alertas de omisión
            </p>
          ) : (
            <div className="space-y-2">
              {omissionWarnings.map((warning) => (
                <div key={warning.id} className="p-3 border rounded">
                  {warning.message}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

