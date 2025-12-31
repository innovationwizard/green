'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSyncStatus } from '@/lib/indexeddb/outbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Database, 
  RefreshCw, 
  FileText,
  Settings,
  BarChart3,
  Wrench,
  Eye,
  XCircle
} from 'lucide-react'

interface SystemStatus {
  totalUsers: number
  activeUsers: number
  totalEvents: number
  recentEvents24h: number
  pendingSync: number
  syncErrors: number
  lastSyncTime: Date | null
  exceptionsCount: number
  lastProjectionUpdate: string | null
}

export default function DevDashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const loadSystemStatus = useCallback(async () => {
    try {
      setError(null)
      
      // Run all queries in parallel for better performance (enterprise-grade)
      const [
        totalUsersResult,
        recentEventsResult,
        totalEventsResult,
        recentEvents24hResult,
        exceptionsResult,
        projectionResult,
        syncStatusResult,
      ] = await Promise.all([
        // Total users
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // Active users (users with events in last 7 days)
        (async () => {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const result = await supabase
            .from('events')
            .select('created_by')
            .gte('created_at', sevenDaysAgo.toISOString())
          return result as { data: Array<{ created_by: string }> | null; error: unknown }
        })(),
        
        // Total events
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true }),
        
        // Recent events (last 24 hours)
        (async () => {
          const oneDayAgo = new Date()
          oneDayAgo.setDate(oneDayAgo.getDate() - 1)
          return supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneDayAgo.toISOString())
        })(),
        
        // Exceptions count (events flagged as duplicates)
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('is_duplicate', true),
        
        // Last projection update
        supabase
          .from('project_costs_daily')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single(),
        
        // Sync status from IndexedDB (real data, not placeholder)
        getSyncStatus().catch(() => ({ pending: 0, lastSyncTime: null, errors: 0 })),
      ])

      // Extract active users count
      const activeUserIds = new Set(
        (recentEventsResult.data as Array<{ created_by: string }> | null)?.map((e: { created_by: string }) => e.created_by) || []
      )
      const activeUsers = activeUserIds.size

      // Handle projection data error gracefully
      const projectionData = projectionResult.error ? null : projectionResult.data

      setStatus({
        totalUsers: totalUsersResult.count || 0,
        activeUsers,
        totalEvents: totalEventsResult.count || 0,
        recentEvents24h: recentEvents24hResult.count || 0,
        pendingSync: syncStatusResult.pending,
        syncErrors: syncStatusResult.errors,
        lastSyncTime: syncStatusResult.lastSyncTime,
        exceptionsCount: exceptionsResult.count || 0,
        lastProjectionUpdate: projectionData 
          ? (projectionData as { updated_at: string }).updated_at 
          : null,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar el estado del sistema'
      console.error('Error loading system status:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadSystemStatus()
    // Auto-refresh every 30 seconds for real-time monitoring
    const interval = setInterval(loadSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [loadSystemStatus])

  if (loading && !status) {
    return (
      <div className="p-4">
        <div className="text-center">Cargando estado del sistema...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        <Button 
          onClick={loadSystemStatus} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.activeUsers || 0} activos (7 días)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.recentEvents24h || 0} en últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excepciones</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.exceptionsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Eventos duplicados detectados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyecciones</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.lastProjectionUpdate ? '✓' : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.lastProjectionUpdate 
                ? `Actualizado: ${new Date(status.lastProjectionUpdate).toLocaleString('es-GT')}`
                : 'Sin actualizaciones'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronización Pendiente</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.pendingSync || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.syncErrors && status.syncErrors > 0 
                ? `${status.syncErrors} con errores`
                : status?.lastSyncTime
                  ? `Última sync: ${new Date(status.lastSyncTime).toLocaleString('es-GT')}`
                  : 'Sin sincronizaciones'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access to Interfaces */}
      <Card>
        <CardHeader>
          <CardTitle>Acceso Rápido a Interfaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/dashboards">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-5 h-5" />
                    Admin Interface
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Dashboards, CRUD, reconciliación
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/manager/dashboards">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="w-5 h-5" />
                    Manager Interface
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Dashboards ejecutivos (solo lectura)
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/installer/eventos">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="w-5 h-5" />
                    Installer Interface
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Creación de eventos offline
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Support & Debugging Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Herramientas de Soporte y Debugging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/exceptions">
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Centro de Excepciones
              </Button>
            </Link>
            <Link href="/admin/audit/export">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Exportar Auditoría
              </Button>
            </Link>
            <Link href="/admin/onboarding">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Configuración del Sistema
              </Button>
            </Link>
            <Link href="/admin/projections">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="w-4 h-4 mr-2" />
                Proyecciones
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

