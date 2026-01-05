'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  RefreshCw, 
  XCircle, 
  AlertTriangle,
  Upload,
  Download,
  Settings,
  Users,
  FolderOpen
} from 'lucide-react'

interface AdminWorkMetrics {
  pendingExceptions: number
  recentEvents24h: number
  totalProjects: number
  lastProjectionUpdate: string | null
}

export default function DashboardsPage() {
  const [metrics, setMetrics] = useState<AdminWorkMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const supabase = createClient()

  const loadWorkMetrics = useCallback(async () => {
    try {
      setError(null)
      
      // Load operational metrics in parallel (enterprise-grade performance)
      const [
        exceptionsResult,
        recentEventsResult,
        projectsResult,
        projectionResult,
      ] = await Promise.all([
        // Pending exceptions (work queue)
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('duplicate_flag', true)
          .eq('hidden', false),
        
        // Recent events (last 24 hours)
        (async () => {
          const oneDayAgo = new Date()
          oneDayAgo.setDate(oneDayAgo.getDate() - 1)
          return supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneDayAgo.toISOString())
        })(),
        
        // Total projects
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true }),
        
        // Last projection update
        supabase
          .from('project_costs_daily')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single(),
      ])

      if (exceptionsResult.error) throw exceptionsResult.error
      if (recentEventsResult.error) throw recentEventsResult.error
      if (projectsResult.error) throw projectsResult.error

      // Handle projection result (may be null if no data exists)
      const projectionData = projectionResult.error ? null : projectionResult.data

      setMetrics({
        pendingExceptions: exceptionsResult.count || 0,
        recentEvents24h: recentEventsResult.count || 0,
        totalProjects: projectsResult.count || 0,
        lastProjectionUpdate: projectionData 
          ? (projectionData as { updated_at: string }).updated_at 
          : null,
      })
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar métricas operacionales'
      console.error('Error loading work metrics:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadWorkMetrics()
    // Auto-refresh every 2 minutes for operational monitoring
    const interval = setInterval(loadWorkMetrics, 120000)
    return () => clearInterval(interval)
  }, [loadWorkMetrics])

  const dashboards = [
    {
      href: '/admin/dashboards/resumen-ejecutivo',
      title: 'Resumen Ejecutivo',
      description: 'KPIs principales y análisis financiero general',
      icon: BarChart3,
    },
    {
      href: '/admin/dashboards/economia-unitaria',
      title: 'Economía Unitaria por Proyecto',
      description: 'Análisis de margen y rentabilidad por proyecto',
      icon: TrendingUp,
    },
    {
      href: '/admin/dashboards/pipeline-ventas',
      title: 'Velocidad del Pipeline de Ventas',
      description: 'Conversión y velocidad de ventas',
      icon: FileText,
    },
    {
      href: '/admin/dashboards/flujo-caja',
      title: 'Flujo de Caja y Capital de Trabajo',
      description: 'Análisis de flujo de efectivo y capital de trabajo',
      icon: DollarSign,
    },
  ]

  const quickActions = [
    {
      href: '/admin/projects',
      title: 'Proyectos',
      description: 'Ver y gestionar todos los proyectos',
      icon: FolderOpen,
    },
    {
      href: '/admin/users',
      title: 'Gestión de Usuarios',
      description: 'Crear, editar y administrar usuarios',
      icon: Users,
    },
    {
      href: '/admin/exceptions',
      title: 'Centro de Excepciones',
      description: 'Revisar y resolver eventos duplicados',
      icon: AlertTriangle,
      badge: metrics?.pendingExceptions || 0,
    },
    {
      href: '/admin/quotes/import',
      title: 'Importar Cotización',
      description: 'Importar cotizaciones CSV/XLSX/PDF',
      icon: Upload,
    },
    {
      href: '/admin/audit/export',
      title: 'Exportar Auditoría',
      description: 'Exportar reportes CSV/XLSX/PDF',
      icon: Download,
    },
    {
      href: '/admin/projections',
      title: 'Actualizar Proyecciones',
      description: 'Ejecutar cálculos de proyecciones',
      icon: RefreshCw,
    },
    {
      href: '/admin/onboarding',
      title: 'Configuración',
      description: 'Configuración del sistema',
      icon: Settings,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel Administrativo</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {lastUpdated.toLocaleString('es-GT')}
            </p>
          )}
        </div>
        <Button 
          onClick={loadWorkMetrics} 
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

      {/* Operational Metrics - Work Queue Indicators (Industry Best Practice for Admin Staff) */}
      {metrics && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Métricas Operacionales</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Excepciones Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.pendingExceptions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren atención
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Eventos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.recentEvents24h}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  En últimas 24 horas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Proyectos activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Proyecciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.lastProjectionUpdate ? '✓' : '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.lastProjectionUpdate 
                    ? `Actualizado: ${new Date(metrics.lastProjectionUpdate).toLocaleDateString('es-GT')}`
                    : 'Sin actualizar'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Quick Actions - Common Admin Tasks (Industry Best Practice) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {action.title}
                      </div>
                      {action.badge !== undefined && action.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                          {action.badge}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Dashboards Navigation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Dashboards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboards.map((dashboard) => {
            const Icon = dashboard.icon
            return (
              <Link key={dashboard.href} href={dashboard.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-6 h-6" />
                      {dashboard.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{dashboard.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

