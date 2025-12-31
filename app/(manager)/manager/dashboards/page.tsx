'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { BarChart3, TrendingUp, DollarSign, FileText } from 'lucide-react'

export default function ManagerDashboardsPage() {
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
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboards</h1>
      
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
  )
}

