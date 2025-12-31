'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { ProjectionResult } from '@/types/dashboard.types'

export default function ProjectionsPage() {
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [result, setResult] = useState<ProjectionResult | null>(null)

  async function handleRunProjections() {
    setRunning(true)
    setResult(null)

    try {
      const response = await fetch('/api/projections/update', {
        method: 'GET',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: 'Proyecciones actualizadas exitosamente',
          processed: data.processed,
        })
        setLastRun(new Date())
      } else {
        setResult({
          success: false,
          message: data.error || 'Error al ejecutar proyecciones',
          errors: data.errors,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Actualizar Proyecciones</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Ejecutar Proyecciones
          </CardTitle>
          <CardDescription>
            Actualiza las proyecciones de costos, ingresos y KPIs. Este proceso calcula los datos
            de los últimos 7 días y actualiza los dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRunProjections}
              disabled={running}
              className="min-w-[200px]"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ejecutar Proyecciones
                </>
              )}
            </Button>

            {lastRun && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Última ejecución: {lastRun.toLocaleString('es-GT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.processed && (
                    <p className="text-sm text-green-700 mt-1">
                      Procesado desde {result.processed.start_date} hasta{' '}
                      {result.processed.end_date}
                    </p>
                  )}
                  {result.errors && (
                    <div className="mt-2 text-sm text-red-700">
                      <p className="font-medium">Errores:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {result.errors.costs && (
                          <li>Costos: {result.errors.costs}</li>
                        )}
                        {result.errors.revenue && (
                          <li>Ingresos: {result.errors.revenue}</li>
                        )}
                        {result.errors.checkpoint && (
                          <li>Checkpoint: {result.errors.checkpoint}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Las proyecciones se ejecutan para los últimos 7 días. Para
              actualizar un rango específico, puedes ejecutar este proceso múltiples veces o
              configurar un servicio de cron externo (ver{' '}
              <code className="bg-blue-100 px-1 rounded">CRON_ALTERNATIVES.md</code>).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

