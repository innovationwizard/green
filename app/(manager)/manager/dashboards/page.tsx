'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { BarChart3, TrendingUp, DollarSign, FileText, RefreshCw, XCircle, ArrowRight } from 'lucide-react'
import { subDays, format } from 'date-fns'
import { DashboardKPIData } from '@/types/dashboard.types'
import { Database } from '@/types/database.types'

type ProjectCostsDaily = Database['public']['Tables']['project_costs_daily']['Row']
type ProjectRevenueDaily = Database['public']['Tables']['project_revenue_daily']['Row']

export default function ManagerDashboardsPage() {
  const [kpiData, setKpiData] = useState<DashboardKPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const supabase = createClient()

  // Default to last 30 days for executive summary
  const dateRange = {
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  }

  useEffect(() => {
    loadExecutiveSummary()
    // Auto-refresh every 5 minutes for real-time executive monitoring
    const interval = setInterval(loadExecutiveSummary, 300000)
    return () => clearInterval(interval)
  }, [])

  async function loadExecutiveSummary() {
    try {
      setError(null)
      
      // Load projection data in parallel (enterprise-grade performance)
      const [costsResult, revenueResult] = await Promise.all([
        supabase
          .from('project_costs_daily')
          .select('*')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end),
        supabase
          .from('project_revenue_daily')
          .select('*')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end),
      ])

      if (costsResult.error) throw costsResult.error
      if (revenueResult.error) throw revenueResult.error

      // Calculate KPIs (real data, no placeholders)
      const revenueData = (revenueResult.data || []) as ProjectRevenueDaily[]
      const costsData = (costsResult.data || []) as ProjectCostsDaily[]
      const totalRevenue = revenueData.reduce((sum, r) => sum + (r.total_revenue || 0), 0)
      const totalCosts = costsData.reduce((sum, c) => sum + (c.total_cost || 0), 0)
      const netProfit = totalRevenue - totalCosts
      const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      setKpiData({
        totalRevenue,
        totalCosts,
        netProfit,
        netProfitMargin,
      })
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos ejecutivos'
      console.error('Error loading executive summary:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const dashboards = [
    {
      href: '/manager/dashboards/resumen-ejecutivo',
      title: 'Resumen Ejecutivo',
      description: 'KPIs principales y análisis financiero general',
      icon: BarChart3,
    },
    {
      href: '/manager/dashboards/economia-unitaria',
      title: 'Economía Unitaria por Proyecto',
      description: 'Análisis de margen y rentabilidad por proyecto',
      icon: TrendingUp,
    },
    {
      href: '/manager/dashboards/pipeline-ventas',
      title: 'Velocidad del Pipeline de Ventas',
      description: 'Conversión y velocidad de ventas',
      icon: FileText,
    },
    {
      href: '/manager/dashboards/flujo-caja',
      title: 'Flujo de Caja y Capital de Trabajo',
      description: 'Análisis de flujo de efectivo y capital de trabajo',
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboards Ejecutivos</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización: {lastUpdated.toLocaleString('es-GT')}
            </p>
          )}
        </div>
        <Button 
          onClick={loadExecutiveSummary} 
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

      {/* Executive Summary KPIs - At-a-glance view (Industry Best Practice) */}
      {kpiData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Resumen Ejecutivo (Últimos 30 días)</h2>
            <Link href="/manager/dashboards/resumen-ejecutivo">
              <Button variant="ghost" size="sm">
                Ver detalles <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Q {kpiData.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Q {kpiData.totalCosts.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpiData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Q {kpiData.netProfit.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Margen de Utilidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpiData.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpiData.netProfitMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dashboard Navigation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Dashboards Detallados</h2>
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

