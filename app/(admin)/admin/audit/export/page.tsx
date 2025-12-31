'use client'

import { useState } from 'react'
import { exportAuditLog } from '@/lib/export/audit-export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { subDays } from 'date-fns'
import { format } from 'date-fns'

export default function AuditExportPage() {
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    setExporting(true)
    setError(null)

    try {
      await exportAuditLog(new Date(startDate), new Date(endDate), format)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Exportar Auditoría</h1>

      <Card>
        <CardHeader>
          <CardTitle>Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={exporting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={exporting}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? 'Exportando...' : 'Exportar XLSX'}
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              variant="outline"
            >
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

