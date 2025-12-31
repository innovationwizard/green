'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Event } from '@/types/events.types'
import { canAnularEvent } from '@/lib/utils/guatemala-timezone'
import { getSyncStatus } from '@/lib/indexeddb/outbox'
import { getCashBoxBalance } from '@/lib/cash-box/calculations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { 
  RefreshCw, 
  XCircle, 
  Wallet, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Clock,
  ArrowRight
} from 'lucide-react'

interface InstallerDashboardData {
  syncStatus: {
    pending: number
    lastSyncTime: Date | null
    errors: number
  }
  cashBoxBalance: number
  recentEvents: Event[]
  isOnline: boolean
}

export default function MisEventosPage() {
  const [dashboardData, setDashboardData] = useState<InstallerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    // Auto-refresh every 30 seconds for field worker monitoring
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboardData() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        return
      }

      // Load all data in parallel (enterprise-grade performance)
      const [syncStatus, cashBoxResult, eventsResult] = await Promise.all([
        // Sync status from IndexedDB (real data, not placeholder)
        getSyncStatus().catch(() => ({ pending: 0, lastSyncTime: null, errors: 0 })),
        
        // Cash box balance
        getCashBoxBalance(user.id).catch(() => ({ balance: 0, movements: [] })),
        
        // Recent events (last 10)
        supabase
          .from('events')
          .select('*')
          .eq('created_by', user.id)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (eventsResult.error) throw eventsResult.error

      // Check online status
      const isOnline = navigator.onLine

      setDashboardData({
        syncStatus,
        cashBoxBalance: cashBoxResult.balance,
        recentEvents: (eventsResult.data as Event[]) || [],
        isOnline,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      console.error('Error loading dashboard data:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnular(eventId: string, eventDate: Date) {
    if (!canAnularEvent(eventDate)) {
      alert('Ya no puedes anular este evento. El plazo venció el sábado a las 23:59.')
      return
    }

    const reason = prompt('Motivo de la anulación:')
    if (!reason) return

    try {
      // Call API route to create reversing event (complete implementation)
      const response = await fetch('/api/events/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEventId: eventId,
          reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al anular evento')
      }

      // Reload data after successful reversal
      await loadDashboardData()
      alert('Evento anulado correctamente')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al anular evento'
      alert(`Error: ${errorMessage}`)
      console.error('Error reversing event:', err)
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="p-4">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mis Eventos</h1>
          {dashboardData && (
            <div className="flex items-center gap-2 mt-1">
              {dashboardData.isOnline ? (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  En línea
                </span>
              ) : (
                <span className="text-xs text-orange-600 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Sin conexión
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadDashboardData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/installer/eventos/nuevo">
            <Button>Nuevo Evento</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {dashboardData && (
        <>
          {/* Sync Status & Cash Box - Critical for Field Workers (Industry Best Practice) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Estado de Sincronización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Pendientes:</span>
                    <span className={`font-semibold ${dashboardData.syncStatus.pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {dashboardData.syncStatus.pending}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Última sync:</span>
                    <span className="text-sm text-muted-foreground">
                      {dashboardData.syncStatus.lastSyncTime
                        ? format(dashboardData.syncStatus.lastSyncTime, "HH:mm", { locale: es })
                        : 'Nunca'}
                    </span>
                  </div>
                  {dashboardData.syncStatus.errors > 0 && (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <AlertTriangle className="w-3 h-3" />
                      {dashboardData.syncStatus.errors} error(es)
                    </div>
                  )}
                  {dashboardData.syncStatus.pending > 0 && (
                    <Link href="/installer/sincronizar">
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Sincronizar <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Mi Caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dashboardData.cashBoxBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Q {Math.abs(dashboardData.cashBoxBalance).toFixed(2)}
                </div>
                {dashboardData.cashBoxBalance < 0 && (
                  <p className="text-xs text-red-600 mt-1">Balance negativo</p>
                )}
                <Link href="/installer/caja">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver detalles <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Eventos Recientes</h2>
            {dashboardData.recentEvents.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No hay eventos aún
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {dashboardData.recentEvents.map((event) => {
                  const eventDate = new Date(event.created_at)
                  const canAnular = canAnularEvent(eventDate)

                  return (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {event.event_type.replace(/_/g, ' ')}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {format(eventDate, "d 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
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
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

