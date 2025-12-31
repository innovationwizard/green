'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportData, ExportData, ExportFormat } from '@/lib/export/export-service'
import { useState } from 'react'

interface ExportButtonProps {
  data: ExportData
  formats?: ExportFormat[]
  className?: string
}

export function ExportButton({ data, formats = ['csv', 'xlsx', 'pdf'], className }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  function handleExport(format: ExportFormat) {
    setExporting(true)
    try {
      exportData(data, format)
    } catch (error) {
      alert('Error al exportar: ' + (error instanceof Error ? error.message : 'Desconocido'))
    } finally {
      setExporting(false)
    }
  }

  if (formats.length === 1) {
    return (
      <Button
        onClick={() => handleExport(formats[0])}
        disabled={exporting}
        variant="outline"
        size="sm"
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Exportando...' : `Exportar ${formats[0].toUpperCase()}`}
      </Button>
    )
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {formats.map((format) => (
        <Button
          key={format}
          onClick={() => handleExport(format)}
          disabled={exporting}
          variant="outline"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          {format.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

