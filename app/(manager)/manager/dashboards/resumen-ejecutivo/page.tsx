'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { subDays, format } from 'date-fns'

export default function ManagerResumenEjecutivoPage() {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    // Load projection data
    const { data: costs } = await supabase
      .from('project_costs_daily')
      .select('*')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)

    const { data: revenue } = await supabase
      .from('project_revenue_daily')
      .select('*')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)

    // Calculate KPIs
    const totalRevenue = revenue?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0
    const totalCosts = costs?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0
    const netProfit = totalRevenue - totalCosts
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    setData({
      totalRevenue,
      totalCosts,
      netProfit,
      netProfitMargin,
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Resumen Ejecutivo</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="border rounded px-2 py-1"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      {!data ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay datos aún
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Q {data.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Q {data.totalCosts.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Q {data.netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Margen de Utilidad Neta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.netProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.netProfitMargin.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

