'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { syncOutbox } from '@/lib/sync/sync-service'
import { getSyncStatus } from '@/lib/indexeddb/outbox'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function SincronizarPage() {
  const [status, setStatus] = useState<{
    pending: number
    lastSyncTime: Date | null
    errors: number
  } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    synced: number
    errors: number
    errorMessages: string[]
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadStatus()
    // Refresh status every 5 seconds
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    const result = await getSyncStatus()
    setStatus(result)
  }

  async function handleSync() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSyncing(true)
    setSyncResult(null)

    try {
      const result = await syncOutbox(user.id)
      setSyncResult(result)
      await loadStatus()
    } catch (error) {
      setSyncResult({
        success: false,
        synced: 0,
        errors: 1,
        errorMessages: [error instanceof Error ? error.message : 'Error desconocido'],
      })
    } finally {
      setSyncing(false)
    }
  }

  if (!status) {
    return (
      <div className="p-4">
        <div className="text-center">Cargando estado...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Estado de Sincronización</h1>

      <Card>
        <CardHeader>
          <CardTitle>Estado Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Eventos pendientes:</span>
            <span className="font-semibold">{status.pending}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Última sincronización:</span>
            <span className="font-semibold">
              {status.lastSyncTime
                ? format(status.lastSyncTime, "d 'de' MMM 'a las' HH:mm", { locale: es })
                : 'Nunca'}
            </span>
          </div>

          {status.errors > 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>Errores: {status.errors}</span>
            </div>
          )}

          <Button
            onClick={handleSync}
            disabled={syncing || status.pending === 0}
            className="w-full"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Ahora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Resultado de Sincronización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Eventos sincronizados:</span>
              <span className="font-semibold text-green-600">{syncResult.synced}</span>
            </div>
            {syncResult.errors > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Errores:</span>
                  <span className="font-semibold text-red-600">{syncResult.errors}</span>
                </div>
                {syncResult.errorMessages.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                    <ul className="list-disc list-inside space-y-1">
                      {syncResult.errorMessages.map((msg, idx) => (
                        <li key={idx} className="text-red-800">
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

