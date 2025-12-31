'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Event } from '@/types/events.types'
import { canAnularEvent } from '@/lib/utils/guatemala-timezone'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export default function MisEventosPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', user.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data as Event[] || [])
    }
    setLoading(false)
  }

  async function handleAnular(eventId: string, eventDate: Date) {
    if (!canAnularEvent(eventDate)) {
      alert('Ya no puedes anular este evento. El plazo venció el sábado a las 23:59.')
      return
    }

    const reason = prompt('Motivo de la anulación:')
    if (!reason) return

    // This would call an API route to create the reversing event
    // For now, we'll show a message
    alert('Funcionalidad de anulación en desarrollo. Se creará un evento de reversión.')
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center">Cargando eventos...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mis Eventos</h1>
        <Link href="/installer/eventos/nuevo">
          <Button>Nuevo Evento</Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay eventos aún
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const eventDate = new Date(event.created_at)
            const canAnular = canAnularEvent(eventDate)

            return (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {event.event_type.replace(/_/g, ' ')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(eventDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                    {canAnular && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnular(event.id, eventDate)}
                      >
                        Anular
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

